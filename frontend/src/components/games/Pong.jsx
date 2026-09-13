import { useCallback, useEffect, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { paintRect } from "@/lib/skins";
import Leaderboard from "@/components/games/Leaderboard";
import ScoreSubmit from "@/components/games/ScoreSubmit";

const W = 520;
const H = 340;
const PAD_H = 70;
const PAD_W = 12;
const BALL = 10;

function initial() {
  return {
    py: H / 2 - PAD_H / 2, cy: H / 2 - PAD_H / 2,
    bx: W / 2, by: H / 2, vx: -4.2, vy: 2.4,
    rally: 0, you: 0, cpu: 0, alive: true,
  };
}

export default function Pong() {
  const { skinItem } = useAuth();
  const skin = skinItem("paddle", "paddle_default");
  const skinRef = useRef(skin);
  const canvasRef = useRef(null);
  const g = useRef(initial());
  const raf = useRef(null);
  const keys = useRef({});

  const [phase, setPhase] = useState("idle");
  const [hud, setHud] = useState({ you: 0, cpu: 0, rally: 0 });
  const [refreshKey, setRefreshKey] = useState(0);
  const [score, setScore] = useState(0);

  useEffect(() => { skinRef.current = skin; }, [skin]);

  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const s = g.current;
    ctx.fillStyle = "#0d0d0f";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(244,244,240,0.18)";
    ctx.setLineDash([8, 10]);
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
    ctx.setLineDash([]);

    paintRect(ctx, skinRef.current, 16, s.py, PAD_W, PAD_H, Math.floor(s.by / 8));
    ctx.fillStyle = "#ff2fb9";
    ctx.fillRect(W - 16 - PAD_W, s.cy, PAD_W, PAD_H);
    ctx.fillStyle = "#00e5ff";
    ctx.fillRect(s.bx - BALL / 2, s.by - BALL / 2, BALL, BALL);
  }, []);

  const finish = useCallback(() => {
    cancelAnimationFrame(raf.current);
    g.current.alive = false;
    setScore(g.current.rally * 10 + g.current.you * 100);
    setPhase("over");
  }, []);

  const loop = useCallback(() => {
    const s = g.current;

    if (keys.current.up) s.py -= 6.5;
    if (keys.current.down) s.py += 6.5;
    s.py = Math.max(0, Math.min(H - PAD_H, s.py));

    const target = s.by - PAD_H / 2;
    const cpuSpeed = 3.6 + Math.min(2.4, s.rally * 0.08);
    s.cy += Math.max(-cpuSpeed, Math.min(cpuSpeed, target - s.cy));
    s.cy = Math.max(0, Math.min(H - PAD_H, s.cy));

    s.bx += s.vx;
    s.by += s.vy;
    if (s.by - BALL / 2 < 0 || s.by + BALL / 2 > H) s.vy *= -1;

    if (s.bx - BALL / 2 < 16 + PAD_W && s.bx > 16 && s.by > s.py && s.by < s.py + PAD_H && s.vx < 0) {
      s.vx = Math.min(9, Math.abs(s.vx) * 1.06);
      s.vy += ((s.by - (s.py + PAD_H / 2)) / PAD_H) * 3;
      s.rally += 1;
      setHud({ you: s.you, cpu: s.cpu, rally: s.rally });
    }
    if (s.bx + BALL / 2 > W - 16 - PAD_W && s.bx < W - 16 && s.by > s.cy && s.by < s.cy + PAD_H && s.vx > 0) {
      s.vx = -Math.min(9, Math.abs(s.vx) * 1.04);
      s.vy += ((s.by - (s.cy + PAD_H / 2)) / PAD_H) * 3;
    }

    if (s.bx < -20 || s.bx > W + 20) {
      if (s.bx < 0) s.cpu += 1; else s.you += 1;
      setHud({ you: s.you, cpu: s.cpu, rally: s.rally });
      if (s.you >= 7 || s.cpu >= 7) { draw(); finish(); return; }
      s.bx = W / 2; s.by = H / 2;
      s.vx = s.bx < 0 ? 4.2 : -4.2; s.vy = (Math.random() - 0.5) * 5;
    }

    draw();
    raf.current = requestAnimationFrame(loop);
  }, [draw, finish]);

  useEffect(() => {
    if (phase !== "playing") return;
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [phase, loop]);

  const start = useCallback(() => {
    g.current = initial();
    setHud({ you: 0, cpu: 0, rally: 0 });
    setScore(0);
    draw();
    setPhase("playing");
  }, [draw]);

  useEffect(() => { draw(); }, [draw, skin]);

  useEffect(() => {
    const set = (e, val) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      if (k === "arrowup" || k === "w") { e.preventDefault(); keys.current.up = val; }
      if (k === "arrowdown" || k === "s") { e.preventDefault(); keys.current.down = val; }
    };
    const down = (e) => set(e, true);
    const up = (e) => set(e, false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  const movePaddle = (clientY) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const y = ((clientY - rect.top) / rect.height) * H;
    g.current.py = Math.max(0, Math.min(H - PAD_H, y - PAD_H / 2));
  };

  return (
    <div className="eb-game" data-testid="game-pong">
      <div className="eb-game-main">
        <div className="eb-hud">
          <span className="eb-hud-item">YOU <b data-testid="pong-you">{hud.you}</b></span>
          <span className="eb-hud-item">CPU <b data-testid="pong-cpu">{hud.cpu}</b></span>
          <span className="eb-hud-item">RALLY <b data-testid="pong-rally">{hud.rally}</b></span>
        </div>

        <div className="eb-canvas-wrap">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="eb-canvas"
            onMouseMove={(e) => movePaddle(e.clientY)}
            onTouchMove={(e) => { e.preventDefault(); movePaddle(e.touches[0].clientY); }}
            data-testid="pong-canvas"
          />
          {phase !== "playing" && (
            <div className="eb-canvas-overlay" data-testid="pong-overlay">
              {phase === "idle" && (
                <>
                  <div className="eb-ov-title">PONG</div>
                  <p>mouse, W/S or arrows to move. first to 7 wins. score = rallies + points.</p>
                  <button className="eb-btn" onClick={start} data-testid="pong-start"><Play size={14} /> START</button>
                </>
              )}
              {phase === "over" && (
                <>
                  <div className="eb-ov-title">{hud.you > hud.cpu ? "YOU WIN" : "CPU WINS"}</div>
                  <p>{hud.you} — {hud.cpu} · {hud.rally} rallies · score <b>{score}</b></p>
                  <ScoreSubmit game="pong" score={score} onSaved={() => setRefreshKey((k) => k + 1)} />
                  <button className="eb-btn" onClick={start} data-testid="pong-restart"><RotateCcw size={14} /> PLAY AGAIN</button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="eb-controls">
          <button className="eb-btn" onClick={start} data-testid="pong-reset"><RotateCcw size={14} /> RESET</button>
        </div>
      </div>

      <Leaderboard game="pong" refreshKey={refreshKey} />
    </div>
  );
}
