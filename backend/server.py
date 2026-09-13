from fastapi import FastAPI, APIRouter, Request, HTTPException, Depends
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


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from database import db, client  # noqa: E402
import auth as auth_module  # noqa: E402
import accounts as accounts_module  # noqa: E402
from auth import get_optional_user, public_user  # noqa: E402

app = FastAPI()
api_router = APIRouter(prefix="/api")

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Simple in-memory per-IP rate limiter (used by guestbook / wall / scores)
# ---------------------------------------------------------------------------
_rate_hits = defaultdict(list)


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


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
