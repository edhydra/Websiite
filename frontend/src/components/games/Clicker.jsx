import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw, MousePointerClick } from "lucide-react";
import Leaderboard from "@/components/games/Leaderboard";
import ScoreSubmit from "@/components/games/ScoreSubmit";

const ROUND = 20;

export default function Clicker() {
  const [phase, setPhase] = useState("idle");
  const [clicks, setClicks] = useState(0);
  const [time, setTime] = useState(ROUND);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pop, setPop] = useState(false);
  const clock = useRef(null);

  useEffect(() => () => clearInterval(clock.current), []);

  const start = () => {
    clearInterval(clock.current);
    setClicks(0); setTime(ROUND); setPhase("playing");
    clock.current = setInterval(() => {
      setTime((t) => {
        if (t <= 1) { clearInterval(clock.current); setPhase("over"); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const hit = () => {
    if (phase === "idle") { start(); setClicks(1); return; }
    if (phase !== "playing") return;
    setClicks((c) => c + 1);
    setPop(true);
    setTimeout(() => setPop(false), 70);
  };

  const cps = time < ROUND ? (clicks / Math.max(1, ROUND - time)).toFixed(1) : "0.0";

  return (
    <div className="eb-game" data-testid="game-clicker">
      <div className="eb-game-main">
        <div className="eb-hud">
          <span className="eb-hud-item">CLICKS <b data-testid="clicker-score">{clicks}</b></span>
          <span className="eb-hud-item">TIME <b data-testid="clicker-time">{time}</b></span>
          <span className="eb-hud-item">CPS <b data-testid="clicker-cps">{cps}</b></span>
        </div>

        <div className="eb-canvas-wrap">
          <button
            className={`eb-click-pad ${pop ? "pop" : ""}`}
            onClick={hit}
            data-testid="clicker-pad"
          >
            <MousePointerClick size={40} />
            <span>{phase === "playing" ? "CLICK!" : "TAP TO START"}</span>
          </button>
          {phase === "over" && (
            <div className="eb-canvas-overlay" data-testid="clicker-overlay">
              <div className="eb-ov-title">{clicks} CLICKS</div>
              <p>{cps} clicks per second over {ROUND}s</p>
              <ScoreSubmit game="clicker" score={clicks} onSaved={() => setRefreshKey((k) => k + 1)} />
              <button className="eb-btn" onClick={start} data-testid="clicker-restart"><RotateCcw size={14} /> GO AGAIN</button>
            </div>
          )}
        </div>

        <div className="eb-controls">
          <button className="eb-btn" onClick={start} data-testid="clicker-start"><Play size={14} /> RESTART ROUND</button>
        </div>
      </div>

      <Leaderboard game="clicker" refreshKey={refreshKey} />
    </div>
  );
}
