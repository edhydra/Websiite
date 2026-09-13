"""Username + password auth (JWT). Tokens are returned in the body and also set as cookies."""
import os
import re
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from pydantic import BaseModel, Field

from database import db

JWT_ALGORITHM = "HS256"
ACCESS_MINUTES = 60 * 24 * 14  # long-lived: this is a playground site
START_COINS = 500
DAILY_COINS = 200
MAX_LOGIN_FAILS = 5
LOCKOUT_SECONDS = 15 * 60

USERNAME_RE = re.compile(r"^[A-Za-z0-9_.-]{3,20}$")

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user_id: str, username: str) -> str:
    payload = {
        "sub": user_id,
        "username": username,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_MINUTES),
    }
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def public_user(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "username": doc["username"],
        "coins": doc.get("coins", 0),
        "inventory": doc.get("inventory", []),
        "equipped": doc.get("equipped", {}),
        "last_daily": doc.get("last_daily"),
    }


def _token_from_request(request: Request) -> Optional[str]:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    return request.cookies.get("access_token")


async def _user_from_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired — log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid session.")
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid session.")
    doc = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not doc:
        raise HTTPException(status_code=401, detail="Account not found.")
    return doc


async def get_current_user(request: Request) -> dict:
    token = _token_from_request(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not logged in.")
    return await _user_from_token(token)


async def get_optional_user(request: Request) -> Optional[dict]:
    token = _token_from_request(request)
    if not token:
        return None
    try:
        return await _user_from_token(token)
    except HTTPException:
        return None


class Credentials(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


def _set_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token", value=token, httponly=True, secure=True,
        samesite="none", max_age=ACCESS_MINUTES * 60, path="/",
    )


async def _lockout_key(request: Request, username: str) -> str:
    fwd = request.headers.get("x-forwarded-for")
    ip = fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "unknown")
    return f"{ip}:{username}"


@router.post("/register")
async def register(body: Credentials, request: Request, response: Response):
    username = body.username.strip()
    if not USERNAME_RE.match(username):
        raise HTTPException(status_code=400, detail="Username: 3-20 chars, letters/numbers/._- only.")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    if await db.users.find_one({"username_lower": username.lower()}):
        raise HTTPException(status_code=409, detail="That username is taken.")

    doc = {
        "username": username,
        "username_lower": username.lower(),
        "password_hash": hash_password(body.password),
        "coins": START_COINS,
        "inventory": [],
        "equipped": {},
        "last_daily": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    token = create_access_token(str(res.inserted_id), username)
    _set_cookie(response, token)
    return {"token": token, "user": public_user(doc)}


@router.post("/login")
async def login(body: Credentials, request: Request, response: Response):
    username = body.username.strip()
    key = await _lockout_key(request, username.lower())
    attempt = await db.login_attempts.find_one({"identifier": key})
    if attempt and attempt.get("fails", 0) >= MAX_LOGIN_FAILS:
        last = attempt.get("last", 0)
        if datetime.now(timezone.utc).timestamp() - last < LOCKOUT_SECONDS:
            raise HTTPException(status_code=429, detail="Too many failed logins. Try again in 15 minutes.")
        await db.login_attempts.delete_one({"identifier": key})

    doc = await db.users.find_one({"username_lower": username.lower()})
    if not doc or not verify_password(body.password, doc["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": key},
            {"$inc": {"fails": 1}, "$set": {"last": datetime.now(timezone.utc).timestamp()}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Wrong username or password.")

    await db.login_attempts.delete_one({"identifier": key})
    token = create_access_token(str(doc["_id"]), doc["username"])
    _set_cookie(response, token)
    return {"token": token, "user": public_user(doc)}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


async def ensure_indexes():
    await db.users.create_index("username_lower", unique=True)
    await db.login_attempts.create_index("identifier")
