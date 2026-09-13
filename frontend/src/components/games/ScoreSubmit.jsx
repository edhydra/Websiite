import { useState } from "react";
import { Send } from "lucide-react";
import { postScore } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

/** Shared game-over score submit. Shows handle field for guests, username for accounts. */
export default function ScoreSubmit({ game, score, onSaved }) {
  const { user, setUser } = useAuth();
  const [handle, setHandle] = useState(() => localStorage.getItem("eb_handle") || "");
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  if (score <= 0) return null;

  const save = async () => {
    if (done) return;
    setErr("");
    const h = user ? user.username : (handle.trim() || "anon");
    if (!user) localStorage.setItem("eb_handle", h);
    try {
      const d = await postScore(game, score, h);
      setDone(true);
      if (d.user) setUser(d.user);
      setMsg(d.coins_awarded ? `saved ✦ +${d.coins_awarded} coins` : "saved to the board ✦");
      onSaved?.();
    } catch (e) { setErr(e.message); }
  };

  if (done) return <div className="eb-ok" data-testid={`${game}-saved`}>{msg}</div>;

  return (
    <div className="eb-ov-form">
      {!user && (
        <input
          className="eb-field eb-field-sm"
          placeholder="handle"
          maxLength={20}
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          data-testid={`${game}-handle`}
        />
      )}
      <button className="eb-btn" onClick={save} data-testid={`${game}-submit-score`}>
        <Send size={14} /> SAVE SCORE
      </button>
      {err && <div className="eb-err" data-testid={`${game}-err`}>{err}</div>}
    </div>
  );
}
