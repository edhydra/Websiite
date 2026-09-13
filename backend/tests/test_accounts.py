"""Backend tests for iteration 3: auth, coins, shop, roulette, decks, scores."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://edward-playground.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

TEST_USER = "edwardtest"
TEST_PASS = "snake1234"


def _rand_user():
    return f"TESTu_{uuid.uuid4().hex[:8]}"


@pytest.fixture(scope="module")
def test_account():
    """Login the seeded test account; return (session, token, user)."""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"username": TEST_USER, "password": TEST_PASS})
    if r.status_code != 200:
        pytest.skip(f"Seeded test account login failed: {r.status_code} {r.text}")
    tok = r.json()["token"]
    s.headers.update({"Authorization": f"Bearer {tok}"})
    return s, tok, r.json()["user"]


@pytest.fixture
def fresh_account():
    """Register a brand new user, return (session, token, user)."""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    username = _rand_user()
    r = s.post(f"{API}/auth/register", json={"username": username, "password": "password1"})
    assert r.status_code == 200, r.text
    body = r.json()
    s.headers.update({"Authorization": f"Bearer {body['token']}"})
    return s, body["token"], body["user"]


# ---- Auth ----
class TestAuth:
    def test_register_and_me(self, fresh_account):
        s, tok, user = fresh_account
        assert user["coins"] == 500
        assert isinstance(user["id"], str)
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["username"] == user["username"]

    def test_register_duplicate(self, fresh_account):
        s, tok, user = fresh_account
        r = requests.post(f"{API}/auth/register", json={"username": user["username"], "password": "password1"})
        assert r.status_code == 409

    def test_register_bad_username(self):
        r = requests.post(f"{API}/auth/register", json={"username": "ab", "password": "password1"})
        assert r.status_code == 400
        r = requests.post(f"{API}/auth/register", json={"username": "bad user!", "password": "password1"})
        assert r.status_code == 400

    def test_register_short_password(self):
        r = requests.post(f"{API}/auth/register", json={"username": _rand_user(), "password": "12"})
        assert r.status_code == 400

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"username": TEST_USER, "password": "WRONGPASS"})
        assert r.status_code == 401

    def test_me_requires_auth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_login_seed_account(self, test_account):
        s, tok, user = test_account
        assert user["username"] == TEST_USER


# ---- Coins daily ----
class TestDailyCoins:
    def test_claim_daily_flow(self, fresh_account):
        s, tok, user = fresh_account
        before = user["coins"]
        r = s.post(f"{API}/coins/daily")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["awarded"] == 200
        assert data["user"]["coins"] == before + 200
        # second time same day
        r2 = s.post(f"{API}/coins/daily")
        assert r2.status_code == 400

    def test_daily_requires_auth(self):
        r = requests.post(f"{API}/coins/daily")
        assert r.status_code == 401


# ---- Shop ----
class TestShop:
    def test_list_shop(self):
        r = requests.get(f"{API}/shop")
        assert r.status_code == 200
        items = r.json()["items"]
        slots = {i["slot"] for i in items}
        assert {"bird", "table", "snake", "paddle"}.issubset(slots)

    def test_buy_and_equip(self, fresh_account):
        s, tok, user = fresh_account
        # bird_lime is 150, user has 500
        r = s.post(f"{API}/shop/buy", json={"item_id": "bird_lime"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "bird_lime" in data["inventory"]
        assert data["coins"] == 350
        # equip
        r2 = s.post(f"{API}/shop/equip", json={"item_id": "bird_lime"})
        assert r2.status_code == 200
        assert r2.json()["equipped"]["bird"] == "bird_lime"

    def test_buy_insufficient(self, fresh_account):
        s, tok, user = fresh_account
        r = s.post(f"{API}/shop/buy", json={"item_id": "bird_gold"})  # 1200
        assert r.status_code == 400
        assert "coins" in r.json()["detail"].lower() or "enough" in r.json()["detail"].lower()

    def test_buy_unknown_item(self, fresh_account):
        s, tok, user = fresh_account
        r = s.post(f"{API}/shop/buy", json={"item_id": "nope_xyz"})
        assert r.status_code == 404

    def test_equip_not_owned(self, fresh_account):
        s, tok, user = fresh_account
        r = s.post(f"{API}/shop/equip", json={"item_id": "bird_chrome"})
        assert r.status_code == 400

    def test_equip_free_item(self, fresh_account):
        s, tok, user = fresh_account
        r = s.post(f"{API}/shop/equip", json={"item_id": "snake_default"})
        assert r.status_code == 200
        assert r.json()["equipped"]["snake"] == "snake_default"

    def test_shop_requires_auth(self):
        r = requests.post(f"{API}/shop/buy", json={"item_id": "bird_lime"})
        assert r.status_code == 401


# ---- Roulette ----
class TestRoulette:
    def test_spin_valid_bet(self, fresh_account):
        s, tok, user = fresh_account
        r = s.post(f"{API}/roulette/spin", json={"bet_type": "red", "amount": 50})
        assert r.status_code == 200, r.text
        data = r.json()
        assert 0 <= data["result"] <= 36
        assert data["colour"] in ("red", "black", "green")
        # balance delta must match
        expected = 500 + data["delta"]
        assert data["user"]["coins"] == expected

    def test_spin_number_bet(self, fresh_account):
        s, tok, user = fresh_account
        r = s.post(f"{API}/roulette/spin", json={"bet_type": "number", "amount": 10, "number": 17})
        assert r.status_code == 200

    def test_spin_bet_too_low(self, fresh_account):
        s, tok, user = fresh_account
        r = s.post(f"{API}/roulette/spin", json={"bet_type": "red", "amount": 5})
        assert r.status_code == 400

    def test_spin_bet_too_high(self, fresh_account):
        s, tok, user = fresh_account
        r = s.post(f"{API}/roulette/spin", json={"bet_type": "red", "amount": 5000})
        assert r.status_code == 400

    def test_spin_bad_bet_type(self, fresh_account):
        s, tok, user = fresh_account
        r = s.post(f"{API}/roulette/spin", json={"bet_type": "wibble", "amount": 50})
        assert r.status_code == 400

    def test_spin_number_missing(self, fresh_account):
        s, tok, user = fresh_account
        r = s.post(f"{API}/roulette/spin", json={"bet_type": "number", "amount": 50})
        assert r.status_code == 400

    def test_spin_insufficient_coins(self, fresh_account):
        s, tok, user = fresh_account
        # Drain by trying to bet more than owned
        r = s.post(f"{API}/roulette/spin", json={"bet_type": "red", "amount": 1000})
        # user has 500 < 1000, but 1000 is at max; still should fail with insufficient
        assert r.status_code == 400

    def test_spin_requires_auth(self):
        r = requests.post(f"{API}/roulette/spin", json={"bet_type": "red", "amount": 50})
        assert r.status_code == 401


# ---- Decks ----
class TestDecks:
    def test_deck_crud(self, fresh_account):
        s, tok, user = fresh_account
        # list empty
        r = s.get(f"{API}/decks")
        assert r.status_code == 200
        assert r.json() == []
        # create
        r = s.post(f"{API}/decks", json={"title": "TEST_deck", "cards": [{"front": "hi", "back": "hello"}]})
        assert r.status_code == 200
        d = r.json()
        assert d["title"] == "TEST_deck"
        assert len(d["cards"]) == 1
        did = d["id"]
        # update
        r = s.put(f"{API}/decks/{did}", json={"title": "TEST_deck_v2", "cards": [{"front": "x", "back": "y"}, {"front": "a", "back": "b"}]})
        assert r.status_code == 200
        assert r.json()["title"] == "TEST_deck_v2"
        # list has one
        r = s.get(f"{API}/decks")
        assert len(r.json()) == 1
        # delete
        r = s.delete(f"{API}/decks/{did}")
        assert r.status_code == 200
        r = s.get(f"{API}/decks")
        assert r.json() == []

    def test_deck_isolation(self, fresh_account):
        sA, tokA, userA = fresh_account
        # user B
        sB = requests.Session()
        sB.headers.update({"Content-Type": "application/json"})
        rB = sB.post(f"{API}/auth/register", json={"username": _rand_user(), "password": "password1"})
        sB.headers.update({"Authorization": f"Bearer {rB.json()['token']}"})
        # A creates
        r = sA.post(f"{API}/decks", json={"title": "TEST_A_deck", "cards": []})
        did = r.json()["id"]
        # B cannot see it in own list
        rlist = sB.get(f"{API}/decks")
        assert all(d["id"] != did for d in rlist.json())
        # B cannot update it
        r = sB.put(f"{API}/decks/{did}", json={"title": "hacked", "cards": []})
        assert r.status_code == 404
        # B cannot delete it
        r = sB.delete(f"{API}/decks/{did}")
        assert r.status_code == 404
        # cleanup
        sA.delete(f"{API}/decks/{did}")

    def test_decks_requires_auth(self):
        r = requests.get(f"{API}/decks")
        assert r.status_code == 401


# ---- Scores + coin awarding ----
class TestScoresCoins:
    def test_score_awards_coins_when_logged_in(self, fresh_account):
        s, tok, user = fresh_account
        before = user["coins"]
        r = s.post(f"{API}/scores", json={"game": "flappy", "handle": "ignored", "score": 100})
        assert r.status_code == 200
        d = r.json()
        assert d["coins_awarded"] == 20  # floor(100/5)
        assert d["user"]["coins"] == before + 20
        # handle should be the username, not "ignored"
        assert d["entry"]["handle"] == user["username"]

    def test_score_coin_cap(self, fresh_account):
        s, tok, user = fresh_account
        r = s.post(f"{API}/scores", json={"game": "flappy", "handle": "x", "score": 100000})
        assert r.status_code == 200
        assert r.json()["coins_awarded"] == 300

    def test_score_anon(self):
        r = requests.post(f"{API}/scores", json={"game": "flappy", "handle": "randomanon", "score": 30})
        assert r.status_code == 200
        d = r.json()
        assert d["coins_awarded"] == 0
        assert d["user"] is None
        assert d["entry"]["handle"] == "randomanon"
