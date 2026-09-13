import { useEffect, useRef } from "react";

const COLOURS = ["#b6ff00", "#ff2fb9", "#00e5ff", "#ffbf00", "#ff6a2b", "#f4f4f0"];

/** Three seconds of confetti, then it removes itself. */
export default function Confetti({ onDone }) {
  const ref = useRef(null);

  useEffect(() => {
    const c = ref.current;
    const ctx = c.getContext("2d");
    c.width = window.innerWidth;
    c.height = window.innerHeight;

    const bits = Array.from({ length: 160 }, () => ({
      x: Math.random() * c.width,
      y: -20 - Math.random() * c.height,
      w: 6 + Math.random() * 8,
      h: 8 + Math.random() * 12,
      vy: 2.5 + Math.random() * 4,
      vx: -1.5 + Math.random() * 3,
      rot: Math.random() * Math.PI,
      vr: -0.15 + Math.random() * 0.3,
      colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
    }));

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      bits.forEach((b) => {
        b.x += b.vx;
        b.y += b.vy;
        b.rot += b.vr;
        if (b.y > c.height + 30) { b.y = -20; b.x = Math.random() * c.width; }
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.fillStyle = b.colour;
        ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
        ctx.restore();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();

    const timer = setTimeout(() => onDone(), 3000);
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
  }, [onDone]);

  return <canvas ref={ref} className="eb-confetti" data-testid="confetti" />;
}
