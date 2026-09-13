import { useCallback, useEffect, useRef, useState } from "react";
import { Flag, RotateCcw, Bomb } from "lucide-react";
import Leaderboard from "@/components/games/Leaderboard";
import ScoreSubmit from "@/components/games/ScoreSubmit";

const SIZE = 10;
const MINES = 14;

const key = (r, c) => `${r},${c}`;

function buildBoard(sr, sc) {
  const mines = new Set();
  while (mines.size < MINES) {
    const r = Math.floor(Math.random() * SIZE);
    const c = Math.floor(Math.random() * SIZE);
    if (Math.abs(r - sr) <= 1 && Math.abs(c - sc) <= 1) continue;
    mines.add(key(r, c));
  }
  const counts = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (mines.has(key(r, c))) { counts[r][c] = -1; continue; }
      let n = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (mines.has(key(r + dr, c + dc))) n++;
        }
      }
      counts[r][c] = n;
    }
  }
  return { mines, counts };
}

export default function Minesweeper() {
  const [board, setBoard] = useState(null);
  const [revealed, setRevealed] = useState(() => new Set());
  const [flags, setFlags] = useState(() => new Set());
  const [phase, setPhase] = useState("idle"); // idle | playing | won | lost
  const [seconds, setSeconds] = useState(0);
  const [score, setScore] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const clock = useRef(null);

  useEffect(() => () => clearInterval(clock.current), []);

  const reset = () => {
    clearInterval(clock.current);
    setBoard(null); setRevealed(new Set()); setFlags(new Set());
    setPhase("idle"); setSeconds(0); setScore(0);
  };

  const finish = useCallback((won, openCount) => {
    clearInterval(clock.current);
    setPhase(won ? "won" : "lost");
    if (won) {
      setScore(Math.max(50, 1200 - seconds * 8));
    } else {
      setScore(Math.max(0, openCount * 5));
    }
  }, [seconds]);

  const floodOpen = (b, startR, startC, open) => {
    const stack = [[startR, startC]];
    while (stack.length) {
      const [r, c] = stack.pop();
      if (r < 0 || c < 0 || r >= SIZE || c >= SIZE) continue;
      const k = key(r, c);
      if (open.has(k)) continue;
      open.add(k);
      if (b.counts[r][c] === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) stack.push([r + dr, c + dc]);
        }
      }
    }
  };

  const click = (r, c) => {
    if (phase === "won" || phase === "lost") return;
    const k = key(r, c);
    if (flags.has(k)) return;

    let b = board;
    if (!b) {
      b = buildBoard(r, c);
      setBoard(b);
      setPhase("playing");
      clock.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    }

    if (b.mines.has(k)) {
      const open = new Set(revealed);
      b.mines.forEach((m) => open.add(m));
      setRevealed(open);
      finish(false, revealed.size);
      return;
    }

    const open = new Set(revealed);
    floodOpen(b, r, c, open);
    setRevealed(open);
    if (open.size === SIZE * SIZE - MINES) finish(true, open.size);
  };

  const flag = (e, r, c) => {
    e.preventDefault();
    if (phase === "won" || phase === "lost") return;
    const k = key(r, c);
    if (revealed.has(k)) return;
    const next = new Set(flags);
    if (next.has(k)) next.delete(k); else next.add(k);
    setFlags(next);
  };

  const cellText = (r, c) => {
    const k = key(r, c);
    if (flags.has(k) && !revealed.has(k)) return <Flag size={13} />;
    if (!revealed.has(k)) return "";
    if (!board) return "";
    if (board.counts[r][c] === -1) return <Bomb size={14} />;
    return board.counts[r][c] || "";
  };

  return (
    <div className="eb-game" data-testid="game-minesweeper">
      <div className="eb-game-main">
        <div className="eb-hud">
          <span className="eb-hud-item">MINES <b>{MINES - flags.size}</b></span>
          <span className="eb-hud-item">TIME <b data-testid="mines-time">{seconds}</b></span>
          <span className="eb-hud-item">SCORE <b data-testid="mines-score">{score}</b></span>
        </div>

        <div className="eb-canvas-wrap">
          <div className="eb-mine-grid" data-testid="mines-grid">
            {Array.from({ length: SIZE }).map((_, r) =>
              Array.from({ length: SIZE }).map((__, c) => {
                const k = key(r, c);
                const open = revealed.has(k);
                const n = board?.counts[r][c];
                return (
                  <button
                    key={k}
                    className={`eb-cell ${open ? "open" : ""} ${open && n === -1 ? "boom" : ""}`}
                    data-n={open ? n : ""}
                    onClick={() => click(r, c)}
                    onContextMenu={(e) => flag(e, r, c)}
                    data-testid={`mine-${r}-${c}`}
                  >
                    {cellText(r, c)}
                  </button>
                );
              })
            )}
          </div>
          {(phase === "won" || phase === "lost") && (
            <div className="eb-canvas-overlay" data-testid="mines-overlay">
              <div className="eb-ov-title">{phase === "won" ? "CLEARED" : "BOOM"}</div>
              <p>{seconds}s · score <b>{score}</b></p>
              <ScoreSubmit game="minesweeper" score={score} onSaved={() => setRefreshKey((k) => k + 1)} />
              <button className="eb-btn" onClick={reset} data-testid="mines-restart"><RotateCcw size={14} /> NEW GAME</button>
            </div>
          )}
        </div>

        <div className="eb-controls">
          <span className="eb-muted">left click opens · right click flags</span>
          <button className="eb-btn" onClick={reset} data-testid="mines-reset"><RotateCcw size={14} /> NEW GAME</button>
        </div>
      </div>

      <Leaderboard game="minesweeper" refreshKey={refreshKey} />
    </div>
  );
}
