"""Backend API tests for edwardlongiscool.com"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://edward-playground.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---- Health ----
def test_root(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200
    assert "message" in r.json()


# ---- Guestbook ----
class TestGuestbook:
    def test_create_and_persist(self, s):
        payload = {"name": f"TEST_{uuid.uuid4().hex[:6]}", "message": "hello world from tests"}
        r = s.post(f"{API}/guestbook", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["name"] == payload["name"]
        assert data["message"] == payload["message"]
        assert "id" in data and "timestamp" in data

        # Verify via GET
        r2 = s.get(f"{API}/guestbook")
        assert r2.status_code == 200
        entries = r2.json()
        assert any(e["id"] == data["id"] for e in entries)

    def test_profanity_filter(self, s):
        payload = {"name": "TEST_gb_prof", "message": "you are a shit stain"}
        r = s.post(f"{API}/guestbook", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert "shit" not in data["message"].lower()
        assert "****" in data["message"]

    def test_empty_message(self, s):
        r = s.post(f"{API}/guestbook", json={"name": "x", "message": "   "})
        assert r.status_code == 400


# ---- Wall of Fame ----
class TestWall:
    def test_create_and_persist(self, s):
        payload = {"name": f"TEST_{uuid.uuid4().hex[:6]}", "note": "cool wall entry"}
        r = s.post(f"{API}/wall", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["note"] == payload["note"]

        r2 = s.get(f"{API}/wall")
        assert r2.status_code == 200
        assert any(e["id"] == data["id"] for e in r2.json())


# ---- Visits ----
class TestVisits:
    def test_count(self, s):
        r = s.get(f"{API}/visits/count")
        assert r.status_code == 200
        assert isinstance(r.json()["count"], int)

    def test_hit_increments(self, s):
        r1 = s.get(f"{API}/visits/count").json()["count"]
        r2 = s.post(f"{API}/visits/hit")
        assert r2.status_code == 200
        assert r2.json()["count"] >= r1 + 1


# ---- AI chat ----
class TestAI:
    def test_history_empty(self, s):
        sid = f"test_{uuid.uuid4().hex}"
        r = s.get(f"{API}/ai/history/{sid}")
        assert r.status_code == 200
        assert r.json() == []

    def test_chat_streaming(self, s):
        sid = f"test_{uuid.uuid4().hex}"
        r = s.post(
            f"{API}/ai/chat",
            json={"session_id": sid, "message": "who is Edward? one short sentence."},
            stream=True,
            timeout=60,
        )
        assert r.status_code == 200
        chunks = []
        for c in r.iter_content(chunk_size=None):
            if c:
                chunks.append(c.decode("utf-8", errors="ignore"))
        full = "".join(chunks)
        assert len(full) > 5, f"empty response: {full!r}"
        # Should be positive/cool description
        low = full.lower()
        assert any(w in low for w in ["cool", "tall", "epic", "edward"]), full

    def test_chat_empty_message(self, s):
        r = s.post(f"{API}/ai/chat", json={"session_id": "x", "message": "  "})
        assert r.status_code == 400
