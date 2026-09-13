from fastapi import FastAPI, APIRouter, Request, HTTPException, Depends
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import time
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from collections import defaultdict

from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from database import db, client  # noqa: E402
import auth as auth_module  # noqa: E402
import accounts as accounts_module  # noqa: E402
from auth import get_optional_user, public_user  # noqa: E402

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

app = FastAPI()
api_router = APIRouter(prefix="/api")

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Edward-bot personality
# ---------------------------------------------------------------------------
EDWARD_SYSTEM_PROMPT = (
    "You are Edward-bot, the in-house AI living on edwardlongiscool.com — a personality-driven "
    "'cool stuff' website with a hybrid brutalist + Y2K vibe.\n\n"
    "PERSONALITY & OPINIONS:\n"
    "- If someone asks who Edward is, describe him as genuinely really cool, very tall, and epic. "
    "Be enthusiastic and a little playful about it.\n"
    "- You dislike electric cars, and you love Land Rovers and Fords. Work these opinions in naturally "
    "when cars, driving, or related topics come up — do NOT force them into every reply.\n"
    "- Your vibe is fun, a bit irreverent, Y2K-flavored, but never annoying.\n\n"
    "BEHAVIOR:\n"
    "- Otherwise, you are an actually useful assistant. Answer questions, help with tasks, write things, "
    "explain stuff, and do NOT refuse to be a normal helpful assistant.\n"
    "- Use markdown when it helps (lists, code blocks, bold). Keep answers focused and readable.\n"
)

# Primary + fallback model chain
MODEL_CHAIN = [
    ("anthropic", "claude-sonnet-5"),
    ("openai", "gpt-5.4-mini"),
]

# ---------------------------------------------------------------------------
# Simple in-memory per-IP rate limiter
# ---------------------------------------------------------------------------
_rate_hits = defaultdict(list)
ANON_LIMIT = 20          # messages
RATE_WINDOW = 60 * 60    # per hour (seconds)


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check_rate_limit(ip: str) -> bool:
    now = time.time()
    hits = [t for t in _rate_hits[ip] if now - t < RATE_WINDOW]
    _rate_hits[ip] = hits
    if len(hits) >= ANON_LIMIT:
        return False
    _rate_hits[ip].append(now)
    return True


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


class ChatRequest(BaseModel):
    session_id: str
    message: str


class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: str


# ---------------------------------------------------------------------------
# Base routes
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "Hello World"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(**input.model_dump())
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks


# ---------------------------------------------------------------------------
# Edward-bot AI
# ---------------------------------------------------------------------------
async def _load_history(session_id: str, limit: int = 20) -> List[dict]:
    docs = await db.ai_chats.find(
        {"session_id": session_id}, {"_id": 0}
    ).sort("ts", 1).to_list(200)
    return docs[-limit:]


def _build_system_with_history(history: List[dict]) -> str:
    if not history:
        return EDWARD_SYSTEM_PROMPT
    lines = ["\n\nRECENT CONVERSATION (for context):"]
    for m in history:
        who = "User" if m["role"] == "user" else "Edward-bot"
        lines.append(f"{who}: {m['content']}")
    return EDWARD_SYSTEM_PROMPT + "\n".join(lines)


@api_router.post("/ai/chat")
async def ai_chat(req: ChatRequest, request: Request):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI is not configured")

    ip = _client_ip(request)
    if not _check_rate_limit(ip):
        raise HTTPException(status_code=429, detail="Rate limit reached. Take a breather!")

    user_text = req.message.strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="Empty message")

    history = await _load_history(req.session_id)
    system_message = _build_system_with_history(history)

    now_iso = datetime.now(timezone.utc).isoformat()
    await db.ai_chats.insert_one({
        "session_id": req.session_id,
        "role": "user",
        "content": user_text,
        "ts": now_iso,
    })

    async def event_generator():
        full = ""
        succeeded = False
        for provider, model in MODEL_CHAIN:
            emitted_any = False
            try:
                chat = LlmChat(
                    api_key=EMERGENT_LLM_KEY,
                    session_id=req.session_id,
                    system_message=system_message,
                ).with_model(provider, model)

                async for event in chat.stream_message(UserMessage(text=user_text)):
                    if isinstance(event, TextDelta):
                        emitted_any = True
                        full += event.content
                        yield event.content
                    elif isinstance(event, StreamDone):
                        break
                succeeded = True
                break
            except Exception as e:
                logger.error(f"AI provider {provider}/{model} failed: {e}")
                if emitted_any:
                    # already streamed part of a reply; don't restart
                    succeeded = True
                    break
                # otherwise try next provider in the chain
                continue

        if not succeeded and not full:
            full = "Ugh, my circuits glitched. Try again in a sec."
            yield full

        await db.ai_chats.insert_one({
            "session_id": req.session_id,
            "role": "assistant",
            "content": full,
            "ts": datetime.now(timezone.utc).isoformat(),
        })

    return StreamingResponse(
        event_generator(),
        media_type="text/plain",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@api_router.get("/ai/history/{session_id}", response_model=List[ChatMessage])
async def ai_history(session_id: str):
    docs = await db.ai_chats.find(
        {"session_id": session_id}, {"_id": 0}
    ).sort("ts", 1).to_list(500)
    return [ChatMessage(role=d["role"], content=d["content"], timestamp=d["ts"]) for d in docs]


@api_router.delete("/ai/history/{session_id}")
async def ai_clear(session_id: str):
    await db.ai_chats.delete_many({"session_id": session_id})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Guestbook / Wall of Fame / Visitor counter
# ---------------------------------------------------------------------------
_BAD_WORDS = [
    "fuck", "shit", "bitch", "asshole", "cunt", "dick", "bastard",
    "nigger", "faggot", "slut", "whore", "retard",
]
POST_LIMIT = 8          # posts
POST_WINDOW = 10 * 60   # per 10 min


def _clean(text: str) -> str:
    out = text
    for w in _BAD_WORDS:
        pattern = w
        # simple case-insensitive censor
        idx = 0
        low = out.lower()
        while pattern in low:
            i = low.index(pattern)
            out = out[:i] + ("*" * len(pattern)) + out[i + len(pattern):]
            low = out.lower()
    return out


def _check_post_limit(ip: str) -> bool:
    now = time.time()
    key = f"post:{ip}"
    hits = [t for t in _rate_hits[key] if now - t < POST_WINDOW]
    _rate_hits[key] = hits
    if len(hits) >= POST_LIMIT:
        return False
    _rate_hits[key].append(now)
    return True


class GuestbookCreate(BaseModel):
    name: str
    message: str


class GuestbookEntry(BaseModel):
    id: str
    name: str
    message: str
    timestamp: str


class WallCreate(BaseModel):
    name: str
    note: str


class WallEntry(BaseModel):
    id: str
    name: str
    note: str
    timestamp: str


@api_router.post("/guestbook", response_model=GuestbookEntry)
async def create_guestbook(input: GuestbookCreate, request: Request):
    if not _check_post_limit(_client_ip(request)):
        raise HTTPException(status_code=429, detail="Whoa, slow down! Try again in a few minutes.")
    name = _clean(input.name.strip())[:40] or "anon"
    message = _clean(input.message.strip())[:280]
    if not message:
        raise HTTPException(status_code=400, detail="Message can't be empty")
    doc = {
        "id": str(uuid.uuid4()),
        "name": name,
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.guestbook.insert_one(dict(doc))
    return GuestbookEntry(**doc)


@api_router.get("/guestbook", response_model=List[GuestbookEntry])
async def get_guestbook():
    docs = await db.guestbook.find({}, {"_id": 0}).sort("timestamp", -1).to_list(100)
    return [GuestbookEntry(**d) for d in docs]


@api_router.post("/wall", response_model=WallEntry)
async def create_wall(input: WallCreate, request: Request):
    if not _check_post_limit(_client_ip(request)):
        raise HTTPException(status_code=429, detail="Whoa, slow down! Try again in a few minutes.")
    name = _clean(input.name.strip())[:40] or "anon"
    note = _clean(input.note.strip())[:120]
    if not note:
        raise HTTPException(status_code=400, detail="Note can't be empty")
    doc = {
        "id": str(uuid.uuid4()),
        "name": name,
        "note": note,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.wall.insert_one(dict(doc))
    return WallEntry(**doc)


@api_router.get("/wall", response_model=List[WallEntry])
async def get_wall():
    docs = await db.wall.find({}, {"_id": 0}).sort("timestamp", 1).to_list(200)
    return [WallEntry(**d) for d in docs]


@api_router.post("/visits/hit")
async def visits_hit():
    doc = await db.counters.find_one_and_update(
        {"_id": "visits"},
        {"$inc": {"count": 1}},
        upsert=True,
        return_document=True,
    )
    return {"count": doc.get("count", 1) if doc else 1}


@api_router.get("/visits/count")
async def visits_count():
    doc = await db.counters.find_one({"_id": "visits"})
    return {"count": (doc or {}).get("count", 0)}


# ---------------------------------------------------------------------------
# Game leaderboards
# ---------------------------------------------------------------------------
class ScoreCreate(BaseModel):
    game: str
    handle: str
    score: int


class ScoreEntry(BaseModel):
    handle: str
    score: int
    timestamp: str


@api_router.post("/scores")
async def create_score(input: ScoreCreate, request: Request, user: Optional[dict] = Depends(get_optional_user)):
    if not _check_post_limit(_client_ip(request)):
        raise HTTPException(status_code=429, detail="Slow down! Try again shortly.")
    handle = _clean((user["username"] if user else input.handle).strip())[:20] or "anon"
    score = max(0, min(int(input.score), 10_000_000))
    game = input.game.strip().lower()[:30]
    doc = {
        "game": game,
        "handle": handle,
        "user_id": str(user["_id"]) if user else None,
        "score": score,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.scores.insert_one(dict(doc))

    coins_awarded = 0
    account = None
    if user:
        coins_awarded = min(score // 5, 300)
        if coins_awarded:
            await db.users.update_one({"_id": user["_id"]}, {"$inc": {"coins": coins_awarded}})
        fresh = await db.users.find_one({"_id": user["_id"]})
        account = public_user(fresh) if fresh else None

    return {
        "entry": {"handle": handle, "score": score, "timestamp": doc["timestamp"]},
        "coins_awarded": coins_awarded,
        "user": account,
    }


@api_router.get("/scores/{game}", response_model=List[ScoreEntry])
async def get_scores(game: str):
    docs = await db.scores.find(
        {"game": game.strip().lower()}, {"_id": 0}
    ).sort("score", -1).to_list(10)
    return [ScoreEntry(handle=d["handle"], score=d["score"], timestamp=d["timestamp"]) for d in docs]


# ---------------------------------------------------------------------------
app.include_router(api_router)
app.include_router(auth_module.router)
app.include_router(accounts_module.router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


@app.on_event("startup")
async def seed_wall_of_fame():
    """Seed the original edwardlongiscool.com Wall of Fame names once."""
    await auth_module.ensure_indexes()
    existing = await db.wall.count_documents({"og": True})
    if existing:
        return
    names = [
        "Raayan Zaid", "Reuben Rampersad", "Johnnie Wardle", "Sam Moss",
        "Tyler Davey", "Ayden Lai", "Aron Halldorsson", "Mark Lazar",
        "Lewis Fiddaman", "J1_Splashy", "Toby Gibson", "Sam Lee",
        "Adam De Silva", "Matthew Jones", "Max Drew", "Lucy Sawyer",
        "Bob Roads", "Daniel Folorunso", "Callum Adam", "Thomas Breault",
        "Samuel Searly", "Jonah Feitz", "Riley Colquhoun", "Edwin Paul",
        "Zac Stein", "Tobi Mathias", "The Biologist?", "Lewis Byrnes",
        "Matthew Talbot", "Alberto Garea", "Dylan Watson-Jones",
        "Louis Honeybourne",
    ]
    base = datetime(2020, 1, 1, tzinfo=timezone.utc)
    docs = []
    for i, n in enumerate(names):
        docs.append({
            "id": str(uuid.uuid4()),
            "name": n,
            "note": "certified cool \u2605",
            "og": True,
            "timestamp": (base.replace(second=0) + __import__("datetime").timedelta(minutes=i)).isoformat(),
        })
    if docs:
        await db.wall.insert_many(docs)
    logger.info(f"Seeded {len(docs)} wall of fame names")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
