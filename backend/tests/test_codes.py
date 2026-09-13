"""Backend tests for the new features (iteration 5):
   - secret command-bar codes (metchog/edward/admin11/piastri)
   - Papaya McLaren (site_papaya) shop visibility
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"


def _rand_user():
    return f"TESTc_{uuid.uuid4().hex[:8]}"


@pytest.fixture
def fresh():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    username = _rand_user()
    r = s.post(f"{API}/auth/register", json={"username": username, "password": "password1"})
    assert r.status_code == 200, r.text
    body = r.json()
    s.headers.update({"Authorization": f"Bearer {body['token']}"})
    return s, body["user"], username


# ---------- Code redemption ----------
class TestCodes:
    def test_metchog_grants_1000(self, fresh):
        s, user, _ = fresh
        start = user["coins"]
        r = s.post(f"{API}/codes/redeem", json={"code": "Metchog"})  # case-insensitive
        assert r.status_code == 200, r.text
        body = r.json()
        assert "1000" in body["message"]
        assert body["user"]["coins"] == start + 1000

    def test_edward_grants_100(self, fresh):
        s, user, _ = fresh
        start = user["coins"]
        r = s.post(f"{API}/codes/redeem", json={"code": "edward"})
        assert r.status_code == 200
        assert r.json()["user"]["coins"] == start + 100

    def test_admin11_grants_90000(self, fresh):
        s, user, _ = fresh
        start = user["coins"]
        r = s.post(f"{API}/codes/redeem", json={"code": "ADMIN11"})
        assert r.status_code == 200
        assert r.json()["user"]["coins"] == start + 90000

    def test_piastri_unlocks_papaya(self, fresh):
        s, _, _ = fresh
        r = s.post(f"{API}/codes/redeem", json={"code": "Piastri"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert "site_papaya" in body["user"]["inventory"]

    def test_reuse_returns_400(self, fresh):
        s, _, _ = fresh
        r1 = s.post(f"{API}/codes/redeem", json={"code": "edward"})
        assert r1.status_code == 200
        r2 = s.post(f"{API}/codes/redeem", json={"code": "edward"})
        assert r2.status_code == 400
        assert "already used" in r2.json()["detail"].lower()

    def test_unknown_code_returns_404(self, fresh):
        s, _, _ = fresh
        r = s.post(f"{API}/codes/redeem", json={"code": "gibberish_xyz"})
        assert r.status_code == 404
        assert "does nothing" in r.json()["detail"].lower()

    def test_redeem_requires_auth(self):
        r = requests.post(f"{API}/codes/redeem", json={"code": "edward"})
        assert r.status_code in (401, 403)


# ---------- Shop visibility of site_papaya ----------
class TestPapayaShopVisibility:
    def test_hidden_for_logged_out(self):
        r = requests.get(f"{API}/shop")
        assert r.status_code == 200
        ids = [i["id"] for i in r.json()["items"]]
        assert "site_papaya" not in ids
        assert "site_papaya" not in r.json()["free"]

    def test_hidden_for_fresh_account(self, fresh):
        s, _, _ = fresh
        r = s.get(f"{API}/shop")
        ids = [i["id"] for i in r.json()["items"]]
        assert "site_papaya" not in ids

    def test_visible_after_redeem_and_free(self, fresh):
        s, _, _ = fresh
        assert s.post(f"{API}/codes/redeem", json={"code": "piastri"}).status_code == 200
        r = s.get(f"{API}/shop")
        items = r.json()["items"]
        pap = next((i for i in items if i["id"] == "site_papaya"), None)
        assert pap is not None, "site_papaya should be visible after redeem"
        assert pap["price"] == 0

    def test_equip_papaya_after_redeem(self, fresh):
        s, _, _ = fresh
        assert s.post(f"{API}/codes/redeem", json={"code": "piastri"}).status_code == 200
        r = s.post(f"{API}/shop/equip", json={"item_id": "site_papaya"})
        assert r.status_code == 200, r.text
        assert r.json()["equipped"]["site"] == "site_papaya"

    def test_cannot_equip_papaya_without_redeem(self, fresh):
        s, _, _ = fresh
        r = s.post(f"{API}/shop/equip", json={"item_id": "site_papaya"})
        assert r.status_code == 400
