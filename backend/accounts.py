"""Coins wallet, cosmetics shop, roulette (server-resolved) and flashcard decks."""
import random
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from database import db
from auth import get_current_user, get_optional_user, public_user, DAILY_COINS

router = APIRouter(prefix="/api", tags=["coins"])

# ---------------------------------------------------------------------------
# Shop catalogue (cosmetics only)
# ---------------------------------------------------------------------------
SHOP_ITEMS = [
    # id, slot, name, price, value (main colour), pattern, alt (second colour)
    {"id": "bird_default", "slot": "bird", "name": "Classic Yellow", "price": 0, "value": "#ffd400", "pattern": "solid"},
    {"id": "bird_lime", "slot": "bird", "name": "Lime Bird", "price": 150, "value": "#b6ff00", "pattern": "solid"},
    {"id": "bird_magenta", "slot": "bird", "name": "Hot Magenta", "price": 150, "value": "#ff2fb9", "pattern": "solid"},
    {"id": "bird_cyan", "slot": "bird", "name": "Cyber Cyan", "price": 300, "value": "#00e5ff", "pattern": "solid"},
    {"id": "bird_chrome", "slot": "bird", "name": "Chrome Bird", "price": 600, "value": "#dfe3e8", "pattern": "chrome", "alt": "#8b94a3"},
    {"id": "bird_gold", "slot": "bird", "name": "Solid Gold", "price": 1200, "value": "#ffbf00", "pattern": "chrome", "alt": "#a06b00"},
    {"id": "bird_stripe", "slot": "bird", "name": "Bee Stripes", "price": 400, "value": "#ffd400", "pattern": "stripes", "alt": "#0a0a0b"},
    {"id": "bird_checker", "slot": "bird", "name": "Checker Bird", "price": 450, "value": "#f4f4f0", "pattern": "checker", "alt": "#ff2fb9"},
    {"id": "bird_camo", "slot": "bird", "name": "Camo Bird", "price": 700, "value": "#6f8f4a", "pattern": "dots", "alt": "#2f3d20"},
    {"id": "bird_rainbow", "slot": "bird", "name": "Rainbow Bird", "price": 1000, "value": "#ff0066", "pattern": "rainbow"},
    {"id": "bird_galaxy", "slot": "bird", "name": "Galaxy Bird", "price": 1400, "value": "#2a1b5e", "pattern": "stars", "alt": "#ffffff"},

    {"id": "table_default", "slot": "table", "name": "Classic Green", "price": 0, "value": "#0f5132", "pattern": "solid"},
    {"id": "table_neon", "slot": "table", "name": "Neon Nights", "price": 250, "value": "#1b0033", "pattern": "solid"},
    {"id": "table_chrome", "slot": "table", "name": "Chrome Deck", "price": 500, "value": "#2b2f36", "pattern": "chrome", "alt": "#12141a"},
    {"id": "table_carbon", "slot": "table", "name": "Carbon Fibre", "price": 700, "value": "#17191d", "pattern": "checker", "alt": "#24272e"},
    {"id": "table_felt", "slot": "table", "name": "Striped Felt", "price": 600, "value": "#0c3d5c", "pattern": "stripes", "alt": "#082a3f"},
    {"id": "table_gold", "slot": "table", "name": "High Roller", "price": 1500, "value": "#3a2c00", "pattern": "chrome", "alt": "#ffbf00"},

    {"id": "snake_default", "slot": "snake", "name": "Lime Snake", "price": 0, "value": "#b6ff00", "pattern": "solid"},
    {"id": "snake_ice", "slot": "snake", "name": "Ice Snake", "price": 200, "value": "#8ad8ff", "pattern": "solid"},
    {"id": "snake_ember", "slot": "snake", "name": "Ember Snake", "price": 400, "value": "#ff6a2b", "pattern": "solid"},
    {"id": "snake_stripe", "slot": "snake", "name": "Viper Stripes", "price": 350, "value": "#b6ff00", "pattern": "stripes", "alt": "#1d3300"},
    {"id": "snake_checker", "slot": "snake", "name": "Checker Snake", "price": 500, "value": "#00e5ff", "pattern": "checker", "alt": "#0a0a0b"},
    {"id": "snake_camo", "slot": "snake", "name": "Camo Snake", "price": 650, "value": "#6f8f4a", "pattern": "dots", "alt": "#2f3d20"},
    {"id": "snake_rainbow", "slot": "snake", "name": "Rainbow Snake", "price": 900, "value": "#ff0066", "pattern": "rainbow"},

    {"id": "paddle_default", "slot": "paddle", "name": "White Paddle", "price": 0, "value": "#f4f4f0", "pattern": "solid"},
    {"id": "paddle_lime", "slot": "paddle", "name": "Lime Paddle", "price": 150, "value": "#b6ff00", "pattern": "solid"},
    {"id": "paddle_magenta", "slot": "paddle", "name": "Magenta Paddle", "price": 150, "value": "#ff2fb9", "pattern": "solid"},
    {"id": "paddle_stripe", "slot": "paddle", "name": "Striped Paddle", "price": 300, "value": "#f4f4f0", "pattern": "stripes", "alt": "#ff2fb9"},
    {"id": "paddle_checker", "slot": "paddle", "name": "Checker Paddle", "price": 400, "value": "#ffd400", "pattern": "checker", "alt": "#0a0a0b"},
    {"id": "paddle_rainbow", "slot": "paddle", "name": "Rainbow Paddle", "price": 750, "value": "#ff0066", "pattern": "rainbow"},

    # whole-site themes
    {"id": "site_default", "slot": "site", "name": "Default Y2K", "price": 0, "value": "#b6ff00", "pattern": "solid"},
    {"id": "site_mono", "slot": "site", "name": "Mono Terminal", "price": 400, "value": "#45ff8f", "pattern": "solid"},
    {"id": "site_vapor", "slot": "site", "name": "Vapourwave", "price": 600, "value": "#ff71ce", "pattern": "solid"},
    {"id": "site_matrix", "slot": "site", "name": "Matrix Green", "price": 600, "value": "#00ff41", "pattern": "solid"},
    {"id": "site_sunset", "slot": "site", "name": "Sunset Arcade", "price": 800, "value": "#ff8a3d", "pattern": "solid"},
    {"id": "site_ice", "slot": "site", "name": "Ice Cold", "price": 800, "value": "#7ae7ff", "pattern": "solid"},
    {"id": "site_bubblegum", "slot": "site", "name": "Bubblegum", "price": 1000, "value": "#ff4fa3", "pattern": "solid"},
    {"id": "site_gold", "slot": "site", "name": "Gold Plated", "price": 1600, "value": "#ffbf00", "pattern": "chrome", "alt": "#7a5c00"},
    {"id": "site_papaya", "slot": "site", "name": "Papaya McLaren", "price": 0, "value": "#ff8000",
     "pattern": "chrome", "alt": "#0090d0", "secret": True},

    # site background patterns
    {"id": "bg_grid", "slot": "bg", "name": "Classic Grid", "price": 0, "value": "#00e5ff", "pattern": "solid"},
    {"id": "bg_plain", "slot": "bg", "name": "Plain Black", "price": 100, "value": "#0a0a0b", "pattern": "solid"},
    {"id": "bg_dots", "slot": "bg", "name": "Dot Matrix", "price": 250, "value": "#00e5ff", "pattern": "dots", "alt": "#0a0a0b"},
    {"id": "bg_scanlines", "slot": "bg", "name": "CRT Scanlines", "price": 350, "value": "#f4f4f0", "pattern": "stripes", "alt": "#0a0a0b"},
    {"id": "bg_checker", "slot": "bg", "name": "Checkerboard", "price": 450, "value": "#17171a", "pattern": "checker", "alt": "#0a0a0b"},
    {"id": "bg_stars", "slot": "bg", "name": "Starfield", "price": 600, "value": "#0b1020", "pattern": "stars", "alt": "#ffffff"},
]
_ITEMS_BY_ID = {i["id"]: i for i in SHOP_ITEMS}
FREE_ITEMS = [i["id"] for i in SHOP_ITEMS if i["price"] == 0 and not i.get("secret")]


def _owns(user: dict, item_id: str) -> bool:
    return item_id in FREE_ITEMS or item_id in user.get("inventory", [])


async def _reload(user_id) -> dict:
    doc = await db.users.find_one({"_id": user_id})
    return doc or {}


@router.get("/shop")
async def shop(user: Optional[dict] = Depends(get_optional_user)):
    inventory = set(user.get("inventory", [])) if user else set()
    items = [i for i in SHOP_ITEMS if not i.get("secret") or i["id"] in inventory]
    return {"items": items, "free": FREE_ITEMS}


# ---------------------------------------------------------------------------
# Secret command-bar codes
# ---------------------------------------------------------------------------
CODES = {
    "metchog": {"coins": 1000, "message": "METCHOG APPROVES. +1000 coins"},
    "edward": {"coins": 100, "message": "edward says hi. +100 coins"},
    "admin11": {"coins": 90000, "message": "ADMIN OVERRIDE ACCEPTED. +90000 coins"},
    "piastri": {"item": "site_papaya", "message": "PAPAYA RULES — mclaren theme unlocked, free in the shop"},
}


class CodeBody(BaseModel):
    code: str


@router.post("/codes/redeem")
async def redeem_code(body: CodeBody, user: dict = Depends(get_current_user)):
    code = body.code.strip().lower()
    reward = CODES.get(code)
    if not reward:
        raise HTTPException(status_code=404, detail="that code does nothing.")
    if code in user.get("redeemed", []):
        raise HTTPException(status_code=400, detail="you already used that code.")

    add_to_set = {"redeemed": code}
    update = {}
    if reward.get("item"):
        add_to_set["inventory"] = reward["item"]
    if reward.get("coins"):
        update["$inc"] = {"coins": reward["coins"]}
    update["$addToSet"] = add_to_set

    await db.users.update_one({"_id": user["_id"]}, update)
    return {"message": reward["message"], "user": public_user(await _reload(user["_id"]))}


class BuyBody(BaseModel):
    item_id: str


@router.post("/shop/buy")
async def buy(body: BuyBody, user: dict = Depends(get_current_user)):
    item = _ITEMS_BY_ID.get(body.item_id)
    if not item:
        raise HTTPException(status_code=404, detail="No such item.")
    if _owns(user, item["id"]):
        raise HTTPException(status_code=400, detail="You already own that.")
    if user.get("coins", 0) < item["price"]:
        raise HTTPException(status_code=400, detail="Not enough coins.")
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$inc": {"coins": -item["price"]}, "$addToSet": {"inventory": item["id"]}},
    )
    return public_user(await _reload(user["_id"]))


class EquipBody(BaseModel):
    item_id: str


@router.post("/shop/equip")
async def equip(body: EquipBody, user: dict = Depends(get_current_user)):
    item = _ITEMS_BY_ID.get(body.item_id)
    if not item:
        raise HTTPException(status_code=404, detail="No such item.")
    if not _owns(user, item["id"]):
        raise HTTPException(status_code=400, detail="Buy it first.")
    await db.users.update_one(
        {"_id": user["_id"]}, {"$set": {f"equipped.{item['slot']}": item["id"]}}
    )
    return public_user(await _reload(user["_id"]))


# ---------------------------------------------------------------------------
# Coins
# ---------------------------------------------------------------------------
@router.post("/coins/daily")
async def claim_daily(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if user.get("last_daily") == today:
        raise HTTPException(status_code=400, detail="Already claimed today. Come back tomorrow.")
    await db.users.update_one(
        {"_id": user["_id"]}, {"$inc": {"coins": DAILY_COINS}, "$set": {"last_daily": today}}
    )
    return {"awarded": DAILY_COINS, "user": public_user(await _reload(user["_id"]))}


# ---------------------------------------------------------------------------
# Roulette — the spin is resolved server-side so coins can't be faked
# ---------------------------------------------------------------------------
RED_NUMBERS = {1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36}
MIN_BET = 10
MAX_BET = 1000


class SpinBody(BaseModel):
    bet_type: str          # number | red | black | odd | even | low | high | dozen1 | dozen2 | dozen3
    amount: int
    number: Optional[int] = None


def _payout_multiplier(bet_type: str) -> int:
    if bet_type == "number":
        return 35
    if bet_type in ("dozen1", "dozen2", "dozen3"):
        return 2
    return 1


def _is_win(bet_type: str, number: Optional[int], result: int) -> bool:
    if result == 0:
        return bet_type == "number" and number == 0
    if bet_type == "number":
        return number == result
    if bet_type == "red":
        return result in RED_NUMBERS
    if bet_type == "black":
        return result not in RED_NUMBERS
    if bet_type == "odd":
        return result % 2 == 1
    if bet_type == "even":
        return result % 2 == 0
    if bet_type == "low":
        return 1 <= result <= 18
    if bet_type == "high":
        return 19 <= result <= 36
    if bet_type == "dozen1":
        return 1 <= result <= 12
    if bet_type == "dozen2":
        return 13 <= result <= 24
    if bet_type == "dozen3":
        return 25 <= result <= 36
    return False


VALID_BETS = {"number", "red", "black", "odd", "even", "low", "high", "dozen1", "dozen2", "dozen3"}


@router.post("/roulette/spin")
async def spin(body: SpinBody, user: dict = Depends(get_current_user)):
    if body.bet_type not in VALID_BETS:
        raise HTTPException(status_code=400, detail="Unknown bet.")
    if body.bet_type == "number" and (body.number is None or not 0 <= body.number <= 36):
        raise HTTPException(status_code=400, detail="Pick a number between 0 and 36.")
    if not MIN_BET <= body.amount <= MAX_BET:
        raise HTTPException(status_code=400, detail=f"Bet must be between {MIN_BET} and {MAX_BET} coins.")
    if user.get("coins", 0) < body.amount:
        raise HTTPException(status_code=400, detail="Not enough coins.")

    result = random.randint(0, 36)
    won = _is_win(body.bet_type, body.number, result)
    delta = body.amount * _payout_multiplier(body.bet_type) if won else -body.amount

    await db.users.update_one({"_id": user["_id"]}, {"$inc": {"coins": delta}})
    fresh = await _reload(user["_id"])
    return {
        "result": result,
        "colour": "green" if result == 0 else ("red" if result in RED_NUMBERS else "black"),
        "won": won,
        "delta": delta,
        "user": public_user(fresh),
    }


# ---------------------------------------------------------------------------
# Flashcard decks (per account)
# ---------------------------------------------------------------------------
class Card(BaseModel):
    front: str = Field(max_length=300)
    back: str = Field(max_length=600)


class DeckBody(BaseModel):
    title: str = Field(max_length=80)
    cards: List[Card] = []


def _deck_out(doc: dict) -> dict:
    return {
        "id": doc["id"],
        "title": doc["title"],
        "cards": doc.get("cards", []),
        "updated_at": doc.get("updated_at"),
    }


@router.get("/decks")
async def list_decks(user: dict = Depends(get_current_user)):
    docs = await db.decks.find({"user_id": str(user["_id"])}, {"_id": 0}).sort("updated_at", -1).to_list(100)
    return [_deck_out(d) for d in docs]


@router.post("/decks")
async def create_deck(body: DeckBody, user: dict = Depends(get_current_user)):
    count = await db.decks.count_documents({"user_id": str(user["_id"])})
    if count >= 50:
        raise HTTPException(status_code=400, detail="Deck limit reached (50).")
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": str(user["_id"]),
        "title": body.title.strip() or "untitled deck",
        "cards": [c.model_dump() for c in body.cards],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.decks.insert_one(dict(doc))
    return _deck_out(doc)


@router.put("/decks/{deck_id}")
async def update_deck(deck_id: str, body: DeckBody, user: dict = Depends(get_current_user)):
    res = await db.decks.update_one(
        {"id": deck_id, "user_id": str(user["_id"])},
        {"$set": {
            "title": body.title.strip() or "untitled deck",
            "cards": [c.model_dump() for c in body.cards],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Deck not found.")
    doc = await db.decks.find_one({"id": deck_id}, {"_id": 0})
    return _deck_out(doc)


@router.delete("/decks/{deck_id}")
async def delete_deck(deck_id: str, user: dict = Depends(get_current_user)):
    res = await db.decks.delete_one({"id": deck_id, "user_id": str(user["_id"])})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Deck not found.")
    return {"ok": True}
