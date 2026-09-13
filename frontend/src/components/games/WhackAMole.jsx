import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import Leaderboard from "@/components/games/Leaderboard";
import ScoreSubmit from "@/components/games/ScoreSubmit";

const ROUND = 30;

export default function WhackAMole() {
  const [phase, setPhase] = useState("idle");
  const [time, setTime] = useState(ROUND);
  const [score, setScore] = useState(0);
  const [active, setActive] = useState(-1);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const moleTimer = useRef(null);
  const clock = useRef(null);

  const stop = useCallback(() => {
    clearTimeout(moleTimer.current);
    clearInterval(clock.current);
  }, []);

  useEffect(() => stop, [stop]);

  const popMole = useCallback(() => {
    setActive(Math.floor(Math.random() * 9));
    const delay = 700 + Math.random() * 500;
    moleTimer.current = setTimeout(() => {
      setActive(-1);
      moleTimer.current = setTimeout(popMole, 180 + Math.random() * 320);
    }, delay);
  }, []);

  const start = () => {
    stop();
    setScore(0); setHits(0); setMisses(0); setTime(ROUND); setActive(-1);
    setPhase("playing");
    popMole();
    clock.current = setInterval(() => {
      setTime((t) => {
        if (t <= 1) {
          stop();
          setActive(-1);
          setPhase("over");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const whack = (i) => {
    if (phase !== "playing") return;
    if (i === active) {
      setActive(-1);
      setHits((h) => h + 1);
      setScore((s) => s + 10);
    } else {
      setMisses((m) => m + 1);
      setScore((s) => Math.max(0, s - 5));
    }
  };

  return (
    <div className="eb-game" data-testid="game-whack">
      <div className="eb-game-main">
        <div className="eb-hud">
          <span className="eb-hud-item">SCORE <b data-testid="whack-score">{score}</b></span>
          <span className="eb-hud-item">TIME <b data-testid="whack-time">{time}</b></span>
          <span className="eb-hud-item">HITS <b data-testid="whack-hits">{hits}</b></span>
          <span className="eb-hud-item">MISS <b>{misses}</b></span>
        </div>

        <div className="eb-canvas-wrap">
          <div className="eb-mole-grid" data-testid="whack-grid">
            {Array.from({ length: 9 }).map((_, i) => (
              <button
                key={i}
                className={`eb-hole ${active === i ? "up" : ""}`}
                onClick={() => whack(i)}
                data-testid={`hole-${i}`}
              >
                <span className="eb-mole" />
              </button>
            ))}
          </div>
          {phase !== "playing" && (
            <div className="eb-canvas-overlay" data-testid="whack-overlay">
              {phase === "idle" && (
                <>
                  <div className="eb-ov-title">WHACK-A-MOLE</div>
                  <p>30 seconds. hit +10, miss -5. go.</p>
                  <button className="eb-btn" onClick={start} data-testid="whack-start"><Play size={14} /> START</button>
                </>
              )}
              {phase === "over" && (
                <>
                  <div className="eb-ov-title">TIME UP</div>
                  <p>{hits} hits · score <b>{score}</b></p>
                  <ScoreSubmit game="whack" score={score} onSaved={() => setRefreshKey((k) => k + 1)} />
                  <button className="eb-btn" onClick={start} data-testid="whack-restart"><RotateCcw size={14} /> PLAY AGAIN</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <Leaderboard game="whack" refreshKey={refreshKey} />
    </div>
  );
}
