import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { paintRect } from "@/lib/skins";
import Leaderboard from "@/components/games/Leaderboard";
import ScoreSubmit from "@/components/games/ScoreSubmit";

const COLS = 22;
const ROWS = 22;
const CELL = 20;
const BASE_SPEED = 135;
const MIN_SPEED = 55;
const COMBO_WINDOW = 2600;

const rndCell = () => ({ x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) });

function newFood(snake) {
  let f = rndCell();
  while (snake.some((s) => s.x === f.x && s.y === f.y)) f = rndCell();
  return f;
}

function initial() {
  const snake = [{ x: 11, y: 11 }, { x: 10, y: 11 }, { x: 9, y: 11 }];
  return {
    snake, dir: { x: 1, y: 0 }, nextDir: { x: 1, y: 0 }, food: newFood(snake),
    speed: BASE_SPEED, score: 0, combo: 1, lastEat: 0, alive: true,
  };
}

export default function Snake() {
  const { skinItem } = useAuth();
  const skin = skinItem("snake", "snake_default");
  const canvasRef = useRef(null);
  const g = useRef(initial());
  const timer = useRef(null);
  const touchStart = useRef(null);
  const skinRef = useRef(skin);

  const [phase, setPhase] = useState("idle");
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [wrap, setWrap] = useState(true);
  const wrapRef = useRef(true);
  const [best, setBest] = useState(() => Number(localStorage.getItem("eb_snake_best") || 0));
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => { wrapRef.current = wrap; }, [wrap]);
  useEffect(() => { skinRef.current = skin; }, [skin]);

  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const { snake, food } = g.current;

    ctx.fillStyle = "#0d0d0f";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "rgba(0,229,255,0.08)";
    ctx.lineWidth = 1;
    for (let i = 1; i < COLS; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, ROWS * CELL); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(COLS * CELL, i * CELL); ctx.stroke();
    }
    ctx.fillStyle = "#ff2fb9";
    ctx.fillRect(food.x * CELL + 3, food.y * CELL + 3, CELL - 6, CELL - 6);
    snake.forEach((s, i) => {
      if (i === 0) {
        ctx.fillStyle = "#00e5ff";
        ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
      } else {
        paintRect(ctx, skinRef.current, s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, i);
      }
    });
  }, []);

  const die = useCallback(() => {
    const s = g.current.score;
    g.current.alive = false;
    clearTimeout(timer.current);
    setPhase("over");
    if (s > Number(localStorage.getItem("eb_snake_best") || 0)) {
      localStorage.setItem("eb_snake_best", String(s));
      setBest(s);
    }
  }, []);

  const step = useCallback(() => {
    const s = g.current;
    s.dir = s.nextDir;
    const head = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y };

    if (wrapRef.current) {
      head.x = (head.x + COLS) % COLS;
      head.y = (head.y + ROWS) % ROWS;
    } else if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) {
      die(); return;
    }

    const ate = head.x === s.food.x && head.y === s.food.y;
    const body = ate ? s.snake : s.snake.slice(0, -1);
    if (body.some((b) => b.x === head.x && b.y === head.y)) { die(); return; }
    s.snake = [head, ...body];

    if (ate) {
      const now = Date.now();
      s.combo = now - s.lastEat < COMBO_WINDOW ? Math.min(s.combo + 1, 5) : 1;
      s.lastEat = now;
      s.score += 10 * s.combo;
      s.speed = Math.max(MIN_SPEED, BASE_SPEED - s.snake.length * 2);
      s.food = newFood(s.snake);
      setScore(s.score);
      setCombo(s.combo);
    } else if (s.combo > 1 && Date.now() - s.lastEat > COMBO_WINDOW) {
      s.combo = 1; setCombo(1);
    }
    draw();
  }, [die, draw]);

  useEffect(() => {
    if (phase !== "playing") return;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      step();
      if (!g.current.alive || cancelled) return;
      timer.current = setTimeout(tick, g.current.speed);
    };
    timer.current = setTimeout(tick, g.current.speed);
    return () => { cancelled = true; clearTimeout(timer.current); };
  }, [phase, step]);

  const start = useCallback(() => {
    g.current = initial();
    setScore(0); setCombo(1);
    draw();
    setPhase("playing");
  }, [draw]);

  const turn = useCallback((x, y) => {
    const { dir } = g.current;
    if ((dir.x === -x && dir.y === -y) || (dir.x === x && dir.y === y)) return;
    g.current.nextDir = { x, y };
  }, []);

  useEffect(() => { draw(); }, [draw, skin]);

  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      const map = {
        arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1],
        arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0],
      };
      if (map[k]) {
        e.preventDefault();
        if (phase === "idle") start();
        turn(map[k][0], map[k][1]);
        return;
      }
      if (k === " ") {
        e.preventDefault();
        if (phase === "playing") setPhase("paused");
        else if (phase === "paused") setPhase("playing");
        else if (phase === "idle") start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, start, turn]);

  const onTouchStart = (e) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
    if (phase === "idle") start();
    if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0);
    else turn(0, dy > 0 ? 1 : -1);
  };

  return (
    <div className="eb-game" data-testid="game-snake">
      <div className="eb-game-main">
        <div className="eb-hud">
          <span className="eb-hud-item">SCORE <b data-testid="snake-score">{score}</b></span>
          <span className="eb-hud-item">BEST <b data-testid="snake-best">{best}</b></span>
          <span className={`eb-hud-item ${combo > 1 ? "hot" : ""}`}>COMBO <b data-testid="snake-combo">x{combo}</b></span>
        </div>

        <div className="eb-canvas-wrap" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <canvas ref={canvasRef} width={COLS * CELL} height={ROWS * CELL} className="eb-canvas" data-testid="snake-canvas" />
          {phase !== "playing" && (
            <div className="eb-canvas-overlay" data-testid="snake-overlay">
              {phase === "idle" && (
                <>
                  <div className="eb-ov-title">SNAKE</div>
                  <p>arrows / WASD to move · space to pause · swipe on mobile</p>
                  <button className="eb-btn" onClick={start} data-testid="snake-start"><Play size={14} /> START</button>
                </>
              )}
              {phase === "paused" && (
                <>
                  <div className="eb-ov-title">PAUSED</div>
                  <button className="eb-btn" onClick={() => setPhase("playing")} data-testid="snake-resume"><Play size={14} /> RESUME</button>
                </>
              )}
              {phase === "over" && (
                <>
                  <div className="eb-ov-title">GAME OVER</div>
                  <p>you scored <b>{score}</b></p>
                  <ScoreSubmit game="snake" score={score} onSaved={() => setRefreshKey((k) => k + 1)} />
                  <button className="eb-btn" onClick={start} data-testid="snake-restart"><RotateCcw size={14} /> PLAY AGAIN</button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="eb-controls">
          <button className={`eb-toggle ${wrap ? "on" : ""}`} onClick={() => setWrap((w) => !w)} data-testid="snake-wrap-toggle">
            WRAPAROUND: {wrap ? "ON" : "OFF"}
          </button>
          {phase === "playing" && (
            <button className="eb-btn" onClick={() => setPhase("paused")} data-testid="snake-pause"><Pause size={14} /> PAUSE</button>
          )}
          <button className="eb-btn" onClick={start} data-testid="snake-reset"><RotateCcw size={14} /> RESET</button>
        </div>

        <div className="eb-dpad" data-testid="snake-dpad">
          <button onClick={() => turn(0, -1)} data-testid="dpad-up">▲</button>
          <div>
            <button onClick={() => turn(-1, 0)} data-testid="dpad-left">◀</button>
            <button onClick={() => turn(0, 1)} data-testid="dpad-down">▼</button>
            <button onClick={() => turn(1, 0)} data-testid="dpad-right">▶</button>
          </div>
        </div>
      </div>

      <Leaderboard game="snake" refreshKey={refreshKey} />
    </div>
  );
}
