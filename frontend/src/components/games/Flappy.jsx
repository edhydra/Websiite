import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { paintRect } from "@/lib/skins";
import Leaderboard from "@/components/games/Leaderboard";
import ScoreSubmit from "@/components/games/ScoreSubmit";

const W = 440;
const H = 520;
const BIRD_X = 100;
const R = 13;
const GRAVITY = 0.42;
const FLAP = -7.2;
const PIPE_W = 62;
const GAP = 140;
const SPACING = 210;

function initial() {
  return {
    y: H / 2, vy: 0, score: 0, alive: true, speed: 2.3, frame: 0,
    pipes: [{ x: W + 80, gapY: 180 }, { x: W + 80 + SPACING, gapY: 260 }],
  };
}

export default function Flappy() {
  const { skinItem } = useAuth();
  const skin = skinItem("bird", "bird_default");
  const skinRef = useRef(skin);
  const canvasRef = useRef(null);
  const g = useRef(initial());
  const raf = useRef(null);

  const [phase, setPhase] = useState("idle");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem("eb_flappy_best") || 0));
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => { skinRef.current = skin; }, [skin]);

  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const s = g.current;

    ctx.fillStyle = "#0b1020";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(0,229,255,0.06)";
    for (let i = 0; i < 40; i++) {
      const x = (i * 97 + s.frame * 0.3) % W;
      ctx.fillRect(W - x, (i * 53) % H, 2, 2);
    }

    s.pipes.forEach((p) => {
      ctx.fillStyle = "#b6ff00";
      ctx.fillRect(p.x, 0, PIPE_W, p.gapY);
      ctx.fillRect(p.x, p.gapY + GAP, PIPE_W, H - p.gapY - GAP);
      ctx.fillStyle = "#0a0a0b";
      ctx.fillRect(p.x, p.gapY - 14, PIPE_W, 14);
      ctx.fillRect(p.x, p.gapY + GAP, PIPE_W, 14);
    });

    ctx.fillStyle = "#2a2a2e";
    ctx.fillRect(0, H - 18, W, 18);

    ctx.save();
    ctx.translate(BIRD_X, s.y);
    ctx.rotate(Math.max(-0.5, Math.min(0.9, s.vy / 12)));
    paintRect(ctx, skinRef.current, -R, -R, R * 2, R * 2, Math.floor(s.frame / 6));
    ctx.fillStyle = "#0a0a0b";
    ctx.fillRect(4, -7, 5, 5);
    ctx.fillStyle = "#ff2fb9";
    ctx.fillRect(R - 2, -2, 8, 5);
    ctx.restore();
  }, []);

  const die = useCallback(() => {
    g.current.alive = false;
    cancelAnimationFrame(raf.current);
    setPhase("over");
    const s = g.current.score;
    if (s > Number(localStorage.getItem("eb_flappy_best") || 0)) {
      localStorage.setItem("eb_flappy_best", String(s));
      setBest(s);
    }
  }, []);

  const loop = useCallback(() => {
    const s = g.current;
    s.frame++;
    s.vy += GRAVITY;
    s.y += s.vy;

    s.pipes.forEach((p) => { p.x -= s.speed; });
    if (s.pipes[0].x + PIPE_W < 0) {
      s.pipes.shift();
      const last = s.pipes[s.pipes.length - 1];
      s.pipes.push({ x: last.x + SPACING, gapY: 60 + Math.random() * (H - GAP - 140) });
    }

    s.pipes.forEach((p) => {
      if (!p.passed && p.x + PIPE_W < BIRD_X - R) {
        p.passed = true;
        s.score += 1;
        s.speed = Math.min(4.6, s.speed + 0.06);
        setScore(s.score);
      }
    });

    if (s.y + R > H - 18 || s.y - R < 0) { draw(); die(); return; }
    const hit = s.pipes.some((p) =>
      BIRD_X + R > p.x && BIRD_X - R < p.x + PIPE_W &&
      (s.y - R < p.gapY || s.y + R > p.gapY + GAP)
    );
    if (hit) { draw(); die(); return; }

    draw();
    raf.current = requestAnimationFrame(loop);
  }, [die, draw]);

  useEffect(() => {
    if (phase !== "playing") return;
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [phase, loop]);

  const start = useCallback(() => {
    g.current = initial();
    setScore(0);
    draw();
    setPhase("playing");
  }, [draw]);

  const flap = useCallback(() => {
    if (phase === "idle") { start(); g.current.vy = FLAP; return; }
    if (phase === "playing") g.current.vy = FLAP;
  }, [phase, start]);

  useEffect(() => { draw(); }, [draw, skin]);

  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === " " || e.key === "ArrowUp") { e.preventDefault(); flap(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flap]);

  return (
    <div className="eb-game" data-testid="game-flappy">
      <div className="eb-game-main">
        <div className="eb-hud">
          <span className="eb-hud-item">PIPES <b data-testid="flappy-score">{score}</b></span>
          <span className="eb-hud-item">BEST <b data-testid="flappy-best">{best}</b></span>
        </div>

        <div className="eb-canvas-wrap">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="eb-canvas"
            onMouseDown={flap}
            onTouchStart={(e) => { e.preventDefault(); flap(); }}
            data-testid="flappy-canvas"
          />
          {phase !== "playing" && (
            <div className="eb-canvas-overlay" data-testid="flappy-overlay">
              {phase === "idle" && (
                <>
                  <div className="eb-ov-title">FLAPPY</div>
                  <p>space / click / tap to flap. don't hit the pipes. buy bird skins in the shop.</p>
                  <button className="eb-btn" onClick={flap} data-testid="flappy-start"><Play size={14} /> START</button>
                </>
              )}
              {phase === "over" && (
                <>
                  <div className="eb-ov-title">SPLAT</div>
                  <p>you cleared <b>{score}</b> pipes</p>
                  <ScoreSubmit game="flappy" score={score} onSaved={() => setRefreshKey((k) => k + 1)} />
                  <button className="eb-btn" onClick={start} data-testid="flappy-restart"><RotateCcw size={14} /> PLAY AGAIN</button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="eb-controls">
          <button className="eb-btn" onClick={flap} data-testid="flappy-flap">FLAP</button>
          <button className="eb-btn" onClick={start} data-testid="flappy-reset"><RotateCcw size={14} /> RESET</button>
        </div>
      </div>

      <Leaderboard game="flappy" refreshKey={refreshKey} />
    </div>
  );
}
