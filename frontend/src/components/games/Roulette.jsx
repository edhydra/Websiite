import { useState } from "react";
import { Coins, LogIn } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { swatchCss } from "@/lib/skins";

const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const OUTSIDE = [
  ["red", "RED", "1:1"], ["black", "BLACK", "1:1"],
  ["odd", "ODD", "1:1"], ["even", "EVEN", "1:1"],
  ["low", "1-18", "1:1"], ["high", "19-36", "1:1"],
  ["dozen1", "1st 12", "2:1"], ["dozen2", "2nd 12", "2:1"], ["dozen3", "3rd 12", "2:1"],
];
const CHIPS = [10, 50, 100, 500];

export default function Roulette({ onLogin }) {
  const { user, setUser, skinItem } = useAuth();
  const tableStyle = swatchCss(skinItem("table", "table_default"));

  const [betType, setBetType] = useState("red");
  const [number, setNumber] = useState(null);
  const [amount, setAmount] = useState(50);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [rolling, setRolling] = useState(0);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [history, setHistory] = useState([]);

  if (!user) {
    return (
      <div className="eb-locked" data-testid="roulette-locked">
        <div className="eb-ov-title">ROULETTE</div>
        <p>you need an account to play with coins — they have to be saved somewhere.</p>
        <button className="eb-btn" onClick={onLogin} data-testid="roulette-login"><LogIn size={14} /> LOG IN / SIGN UP</button>
      </div>
    );
  }

  const pickNumber = (n) => { setBetType("number"); setNumber(n); };

  const spin = async () => {
    if (spinning) return;
    setErr(""); setMsg(""); setSpinning(true); setResult(null);

    const anim = setInterval(() => setRolling(Math.floor(Math.random() * 37)), 70);
    try {
      const d = await api("/roulette/spin", {
        method: "POST",
        body: { bet_type: betType, amount: Number(amount), number },
      });
      await new Promise((r) => setTimeout(r, 900));
      clearInterval(anim);
      setRolling(d.result);
      setResult(d);
      setUser(d.user);
      setHistory((h) => [{ n: d.result, c: d.colour }, ...h].slice(0, 12));
      setMsg(d.won ? `WIN! +${d.delta} coins` : `lost ${Math.abs(d.delta)} coins`);
    } catch (e) {
      clearInterval(anim);
      setErr(e.message);
    }
    setSpinning(false);
  };

  const betLabel = betType === "number" ? `NUMBER ${number ?? "-"}` : OUTSIDE.find((o) => o[0] === betType)?.[1];

  return (
    <div className="eb-roulette" data-testid="game-roulette">
      <div className="eb-roulette-main" style={tableStyle}>
        <div className={`eb-wheel ${result ? (result.won ? "win" : "lose") : ""}`} data-testid="roulette-wheel">
          <span className={`eb-wheel-num ${result ? result.colour : (rolling === 0 ? "green" : RED.has(rolling) ? "red" : "black")}`}>
            {spinning || result ? rolling : "—"}
          </span>
        </div>
        {msg && <div className={`eb-roulette-msg ${result?.won ? "win" : ""}`} data-testid="roulette-msg">{msg}</div>}
        {err && <div className="eb-err" data-testid="roulette-err">{err}</div>}

        <div className="eb-num-grid" data-testid="roulette-numbers">
          {Array.from({ length: 37 }).map((_, n) => (
            <button
              key={n}
              className={`eb-num ${n === 0 ? "green" : RED.has(n) ? "red" : "black"} ${betType === "number" && number === n ? "on" : ""}`}
              onClick={() => pickNumber(n)}
              data-testid={`roulette-num-${n}`}
            >{n}</button>
          ))}
        </div>

        <div className="eb-outside" data-testid="roulette-outside">
          {OUTSIDE.map(([id, label, pay]) => (
            <button
              key={id}
              className={`eb-toggle ${betType === id ? "on" : ""}`}
              onClick={() => { setBetType(id); setNumber(null); }}
              data-testid={`roulette-bet-${id}`}
            >{label} <small>{pay}</small></button>
          ))}
        </div>

        <div className="eb-history" data-testid="roulette-history">
          {history.map((h, i) => <span key={i} className={`eb-hist ${h.c}`}>{h.n}</span>)}
        </div>
      </div>

      <aside className="eb-roulette-side">
        <div className="eb-acc-coins"><Coins size={18} /> <b data-testid="roulette-coins">{user.coins}</b> coins</div>
        <div className="eb-bet-label">BET: <b>{betLabel}</b> {betType === "number" && <small>pays 35:1</small>}</div>

        <div className="eb-chip-row">
          {CHIPS.map((c) => (
            <button
              key={c}
              className={`eb-toggle ${Number(amount) === c ? "on" : ""}`}
              onClick={() => setAmount(c)}
              data-testid={`chip-${c}`}
            >{c}</button>
          ))}
        </div>
        <input
          className="eb-field eb-field-sm"
          type="number"
          min="10"
          max="1000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          data-testid="roulette-amount"
        />
        <button
          className="eb-btn eb-btn-big"
          onClick={spin}
          disabled={spinning || (betType === "number" && number === null)}
          data-testid="roulette-spin"
        >
          {spinning ? "SPINNING..." : "SPIN"}
        </button>
        <p className="eb-muted">min 10 · max 1000 coins. earn more by playing the other games, or claim your daily 200 in your account.</p>
      </aside>
    </div>
  );
}
