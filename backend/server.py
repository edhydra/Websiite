from fastapi import FastAPI, APIRouter, Request, HTTPException
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

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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
app.include_router(api_router)

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


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
