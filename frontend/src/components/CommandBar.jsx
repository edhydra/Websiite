import { useEffect, useRef, useState, useCallback } from "react";
import { SPRITES } from "@/data/assets";

const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];

const HELP = [
  "help — show this list",
  "matrix — enter the matrix",
  "party — party mode!!!",
  "secret — reveal a secret",
  "sudo hire edward — do it",
  "credits — who made this",
  "clear — clear output",
];

function MatrixRain() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; const ctx = c.getContext("2d");
    c.width = window.innerWidth; c.height = window.innerHeight;
    const cols = Math.floor(c.width / 14);
    const drops = Array(cols).fill(1);
    const chars = "01ｱｲｳｴｵｶｷｸ ABCDEF#*";
    let raf;
    const draw = () => {
      ctx.fillStyle = "rgba(10,10,11,0.08)"; ctx.fillRect(0,0,c.width,c.height);
      ctx.fillStyle = "#b6ff00"; ctx.font = "14px monospace";
      drops.forEach((y, i) => {
        const t = chars[Math.floor(Math.random()*chars.length)];
        ctx.fillText(t, i*14, y*14);
        if (y*14 > c.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="eb-matrix" data-testid="matrix-rain" />;
}

export default function CommandBar({ sfx }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");
  const [out, setOut] = useState([]);
  const [matrix, setMatrix] = useState(false);
  const [egg, setEgg] = useState(false);
  const inputRef = useRef(null);
  const konami = useRef([]);

  const push = (lines) => setOut((o) => [...o, ...(Array.isArray(lines) ? lines : [lines])]);

  const run = useCallback((raw) => {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return;
    push(`> ${cmd}`);
    sfx.click();
    switch (cmd) {
      case "help": push(HELP); break;
      case "matrix": setMatrix(true); push("entering the matrix... (click to exit)"); break;
      case "party": document.body.classList.toggle("eb-party"); push("PARTY MODE toggled 🎉"); break;
      case "secret": push("✦ secret: the grey discovery is edward's favourite. don't tell the red one."); break;
      case "sudo hire edward": push(["ACCESS GRANTED.","edward has been HIRED.","salary: 3 land rovers / yr 🚙🚙🚙"]); sfx.good(); break;
      case "credits": push(["edwardlongiscool.com","built by edward (tall, cool, epic)","powered by edward-bot + chiptunes"]); break;
      case "clear": setOut([]); break;
      default: push(`command not found: ${cmd} (try 'help')`);
    }
  }, [sfx]);

  useEffect(() => {
    const onKey = (e) => {
      // konami
      konami.current = [...konami.current, e.key].slice(-KONAMI.length);
      if (KONAMI.every((k, i) => konami.current[i]?.toLowerCase() === k.toLowerCase())) {
        setEgg(true); sfx.good(); konami.current = [];
      }
      if (open) {
        if (e.key === "Escape") setOpen(false);
        return;
      }
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "/" || e.key === "`") {
        e.preventDefault(); setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, sfx]);

  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  return (
    <>
      {matrix && <div onClick={() => setMatrix(false)}><MatrixRain /></div>}

      {open && (
        <div className="eb-cmd" data-testid="command-bar">
          <div className="eb-cmd-out">
            {out.length === 0 && <div className="eb-muted">type 'help' and hit enter. esc to close.</div>}
            {out.map((l, i) => <div key={i} className="eb-cmd-line">{l}</div>)}
          </div>
          <div className="eb-cmd-row">
            <span className="eb-cmd-prompt">$</span>
            <input
              ref={inputRef}
              data-testid="command-input"
              className="eb-cmd-input"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { run(val); setVal(""); } }}
              placeholder="command..."
            />
          </div>
        </div>
      )}

      {egg && (
        <div className="eb-egg" data-testid="konami-egg" onClick={() => setEgg(false)}>
          <img src={SPRITES.edward} alt="" className="eb-egg-sprite pixelated" />
          <h2 className="eb-egg-title">↑↑↓↓←→←→ B A</h2>
          <p>you unlocked EPIC MODE. edward approves. (click to close)</p>
        </div>
      )}
    </>
  );
}
