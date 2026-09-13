import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, LogIn, Save, Shuffle, ArrowLeft, ArrowRight, RotateCw } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

function Study({ deck, onExit }) {
  const [order, setOrder] = useState(deck.cards.map((_, i) => i));
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = deck.cards[order[i]];
  const next = () => { setFlipped(false); setI((v) => (v + 1) % order.length); };
  const prev = () => { setFlipped(false); setI((v) => (v - 1 + order.length) % order.length); };
  const shuffle = () => {
    const o = [...order];
    for (let k = o.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [o[k], o[j]] = [o[j], o[k]];
    }
    setOrder(o); setI(0); setFlipped(false);
  };

  return (
    <div className="eb-study" data-testid="fc-study">
      <div className="eb-controls">
        <button className="eb-toggle" onClick={onExit} data-testid="fc-exit-study"><ArrowLeft size={13} /> BACK TO DECKS</button>
        <button className="eb-toggle" onClick={shuffle} data-testid="fc-shuffle"><Shuffle size={13} /> SHUFFLE</button>
        <span className="eb-muted">{i + 1} / {order.length}</span>
      </div>
      <button
        className={`eb-flashcard ${flipped ? "flipped" : ""}`}
        onClick={() => setFlipped((f) => !f)}
        data-testid="fc-card"
      >
        <span className="eb-fc-side">{flipped ? "ANSWER" : "QUESTION"}</span>
        <span className="eb-fc-text" data-testid="fc-card-text">{flipped ? card.back : card.front}</span>
        <small><RotateCw size={12} /> click to flip</small>
      </button>
      <div className="eb-controls">
        <button className="eb-btn" onClick={prev} data-testid="fc-prev"><ArrowLeft size={14} /> PREV</button>
        <button className="eb-btn" onClick={next} data-testid="fc-next">NEXT <ArrowRight size={14} /></button>
      </div>
    </div>
  );
}

function Editor({ deck, onSave, onCancel }) {
  const [title, setTitle] = useState(deck?.title || "");
  const [cards, setCards] = useState(deck?.cards?.length ? deck.cards : [{ front: "", back: "" }]);
  const [err, setErr] = useState("");

  const setCard = (i, field, v) => {
    const next = [...cards];
    next[i] = { ...next[i], [field]: v };
    setCards(next);
  };

  const save = () => {
    const clean = cards.filter((c) => c.front.trim() && c.back.trim());
    if (!title.trim()) { setErr("give the deck a title"); return; }
    if (!clean.length) { setErr("add at least one card with both sides filled in"); return; }
    onSave({ title: title.trim(), cards: clean });
  };

  return (
    <div className="eb-fc-editor" data-testid="fc-editor">
      <input
        className="eb-field"
        placeholder="deck title (e.g. biology — cells)"
        value={title}
        maxLength={80}
        onChange={(e) => setTitle(e.target.value)}
        data-testid="fc-title"
      />
      {cards.map((c, i) => (
        <div key={i} className="eb-fc-row">
          <input
            className="eb-field"
            placeholder={`question ${i + 1}`}
            value={c.front}
            onChange={(e) => setCard(i, "front", e.target.value)}
            data-testid={`fc-front-${i}`}
          />
          <input
            className="eb-field"
            placeholder={`answer ${i + 1}`}
            value={c.back}
            onChange={(e) => setCard(i, "back", e.target.value)}
            data-testid={`fc-back-${i}`}
          />
          <button
            className="eb-icon"
            onClick={() => setCards(cards.filter((_, k) => k !== i))}
            data-testid={`fc-remove-${i}`}
          ><Trash2 size={14} /></button>
        </div>
      ))}
      {err && <div className="eb-err" data-testid="fc-err">{err}</div>}
      <div className="eb-controls">
        <button className="eb-toggle" onClick={() => setCards([...cards, { front: "", back: "" }])} data-testid="fc-add-card">
          <Plus size={13} /> ADD CARD
        </button>
        <button className="eb-btn" onClick={save} data-testid="fc-save"><Save size={14} /> SAVE DECK</button>
        <button className="eb-toggle" onClick={onCancel} data-testid="fc-cancel">CANCEL</button>
      </div>
    </div>
  );
}

export default function Flashcards({ onLogin }) {
  const { user } = useAuth();
  const [decks, setDecks] = useState([]);
  const [mode, setMode] = useState("list"); // list | edit | study
  const [current, setCurrent] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    api("/decks").then(setDecks).catch((e) => setErr(e.message));
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);

  if (!user) {
    return (
      <div className="eb-locked" data-testid="fc-locked">
        <div className="eb-ov-title">FLASHCARDS</div>
        <p>log in and your decks are saved to your account — make them once, revise them anywhere.</p>
        <button className="eb-btn" onClick={onLogin} data-testid="fc-login"><LogIn size={14} /> LOG IN / SIGN UP</button>
      </div>
    );
  }

  const save = async (body) => {
    setErr("");
    try {
      if (current?.id) await api(`/decks/${current.id}`, { method: "PUT", body });
      else await api("/decks", { method: "POST", body });
      setMode("list"); setCurrent(null); load();
    } catch (e) { setErr(e.message); }
  };

  const remove = async (id) => {
    try { await api(`/decks/${id}`, { method: "DELETE" }); load(); }
    catch (e) { setErr(e.message); }
  };

  if (mode === "edit") return <Editor deck={current} onSave={save} onCancel={() => { setMode("list"); setCurrent(null); }} />;
  if (mode === "study" && current) return <Study deck={current} onExit={() => { setMode("list"); setCurrent(null); }} />;

  return (
    <div className="eb-tool" data-testid="tool-flashcards">
      <div className="eb-controls">
        <button className="eb-btn" onClick={() => { setCurrent(null); setMode("edit"); }} data-testid="fc-new-deck">
          <Plus size={14} /> NEW DECK
        </button>
        <span className="eb-muted">saved to {user.username}'s account</span>
      </div>
      {err && <div className="eb-err" data-testid="fc-list-err">{err}</div>}

      <div className="eb-deck-grid" data-testid="fc-deck-list">
        {decks.length === 0 && <div className="eb-muted">no decks yet. make one ✦</div>}
        {decks.map((d) => (
          <div key={d.id} className="eb-deck" data-testid={`deck-${d.id}`}>
            <div className="eb-deck-title">{d.title}</div>
            <div className="eb-deck-count">{d.cards.length} card{d.cards.length === 1 ? "" : "s"}</div>
            <div className="eb-deck-actions">
              <button className="eb-btn" onClick={() => { setCurrent(d); setMode("study"); }} data-testid={`study-${d.id}`}>STUDY</button>
              <button className="eb-toggle" onClick={() => { setCurrent(d); setMode("edit"); }} data-testid={`edit-${d.id}`}>EDIT</button>
              <button className="eb-icon" onClick={() => remove(d.id)} data-testid={`delete-${d.id}`}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
