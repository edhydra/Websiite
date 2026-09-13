import { useEffect, useRef, useState } from "react";
import { Download, Eraser, Trash2 } from "lucide-react";

const W = 720;
const H = 460;
const COLOURS = ["#f4f4f0", "#0a0a0b", "#b6ff00", "#00e5ff", "#ff2fb9", "#ffbf00", "#ff4d4d", "#7c5cff", "#3ddc84"];

export default function Paint() {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);
  const [colour, setColour] = useState("#b6ff00");
  const [size, setSize] = useState(6);
  const [erase, setErase] = useState(false);

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.fillStyle = "#101012";
    ctx.fillRect(0, 0, W, H);
  }, []);

  const pos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return {
      x: ((p.clientX - rect.left) / rect.width) * W,
      y: ((p.clientY - rect.top) / rect.height) * H,
    };
  };

  const start = (e) => {
    drawing.current = true;
    last.current = pos(e);
  };

  const move = (e) => {
    if (!drawing.current) return;
    if (e.touches) e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const p = pos(e);
    ctx.strokeStyle = erase ? "#101012" : colour;
    ctx.lineWidth = erase ? size * 2.5 : size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };

  const end = () => { drawing.current = false; last.current = null; };

  const clear = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.fillStyle = "#101012";
    ctx.fillRect(0, 0, W, H);
  };

  const download = () => {
    const link = document.createElement("a");
    link.download = "edward-paint.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="eb-paint" data-testid="game-paint">
      <div className="eb-paint-tools">
        <div className="eb-swatches" data-testid="paint-swatches">
          {COLOURS.map((c) => (
            <button
              key={c}
              className={`eb-swatch ${colour === c && !erase ? "on" : ""}`}
              style={{ background: c }}
              onClick={() => { setColour(c); setErase(false); }}
              data-testid={`swatch-${c.replace("#", "")}`}
              aria-label={`colour ${c}`}
            />
          ))}
        </div>
        <label className="eb-brush">
          BRUSH
          <input
            type="range"
            min="2"
            max="40"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            data-testid="paint-size"
          />
          <b>{size}</b>
        </label>
        <button className={`eb-toggle ${erase ? "on" : ""}`} onClick={() => setErase((v) => !v)} data-testid="paint-erase">
          <Eraser size={13} /> ERASER
        </button>
        <button className="eb-btn" onClick={clear} data-testid="paint-clear"><Trash2 size={14} /> CLEAR</button>
        <button className="eb-btn" onClick={download} data-testid="paint-save"><Download size={14} /> SAVE PNG</button>
      </div>

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="eb-canvas eb-paint-canvas"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
        data-testid="paint-canvas"
      />
    </div>
  );
}
