import { useEffect, useState } from "react";
import { BookOpen, Send } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Guestbook({ sfx }) {
  const [entries, setEntries] = useState([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => fetch(`${API}/guestbook`).then((r) => r.json()).then((d) => Array.isArray(d) && setEntries(d)).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!message.trim() || busy) return;
    setBusy(true); setErr("");
    sfx.click();
    try {
      const res = await fetch(`${API}/guestbook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || "anon", message: message.trim() }),
      });
      if (res.status === 429) { setErr("slow down! rate limited."); setBusy(false); return; }
      if (!res.ok) { setErr("could not post."); setBusy(false); return; }
      setMessage(""); sfx.good(); await load();
    } catch (e) { setErr("connection error."); }
    setBusy(false);
  };

  return (
    <section id="guestbook" className="eb-section" data-testid="section-guestbook">
      <h2 className="eb-h2"><BookOpen size={22} /> GUESTBOOK</h2>
      <p className="eb-section-sub">sign the book. keep it cool (profanity gets starred out).</p>

      <div className="eb-gb-form">
        <input data-testid="gb-name" className="eb-field eb-field-sm" placeholder="name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        <textarea data-testid="gb-message" className="eb-field eb-textarea" placeholder="leave a message..." value={message} maxLength={280} onChange={(e) => setMessage(e.target.value)} />
        <button data-testid="gb-submit" className="eb-btn" onClick={submit} disabled={busy}><Send size={14} /> SIGN</button>
      </div>
      {err && <div className="eb-err" data-testid="gb-err">{err}</div>}

      <div className="eb-gb-list" data-testid="gb-list">
        {entries.length === 0 && <div className="eb-muted">no entries yet. say something ✦</div>}
        {entries.map((e) => (
          <div key={e.id} className="eb-gb-entry" data-testid="gb-item">
            <div className="eb-gb-head">&gt; {e.name}</div>
            <div className="eb-gb-msg">{e.message}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
