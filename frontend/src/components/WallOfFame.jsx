import { useEffect, useState } from "react";
import { Trophy, Send } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function WallOfFame({ sfx }) {
  const [entries, setEntries] = useState([]);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => fetch(`${API}/wall`).then((r) => r.json()).then((d) => Array.isArray(d) && setEntries(d)).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!note.trim() || busy) return;
    setBusy(true); setErr("");
    sfx.click();
    try {
      const res = await fetch(`${API}/wall`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || "anon", note: note.trim() }),
      });
      if (res.status === 429) { setErr("slow down! rate limited."); setBusy(false); return; }
      if (!res.ok) { setErr("could not post."); setBusy(false); return; }
      setNote(""); sfx.good(); await load();
    } catch (e) { setErr("connection error."); }
    setBusy(false);
  };

  return (
    <section id="wall" className="eb-section" data-testid="section-wall">
      <h2 className="eb-h2"><Trophy size={22} /> WALL OF FAME</h2>
      <p className="eb-section-sub">the certified cool people. add your name.</p>

      <div className="eb-wall-form">
        <input data-testid="wall-name" className="eb-field eb-field-sm" placeholder="handle" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        <input data-testid="wall-note" className="eb-field" placeholder="drop a note..." value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
        <button data-testid="wall-submit" className="eb-btn" onClick={submit} disabled={busy}><Send size={14} /> ADD</button>
      </div>
      {err && <div className="eb-err" data-testid="wall-err">{err}</div>}

      <div className="eb-wall-grid" data-testid="wall-list">
        {entries.length === 0 && <div className="eb-muted">be the first on the wall ✦</div>}
        {entries.map((e) => (
          <div key={e.id} className="eb-star" data-testid="wall-item">
            <div className="eb-star-name">★ {e.name}</div>
            <div className="eb-star-note">{e.note}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
