/** Skin/pattern rendering shared by the canvas games and the shop previews. */

const hueAt = (i) => `hsl(${(i * 37) % 360} 100% 58%)`;

/** Fill a rect using an item's pattern. `i` seeds rainbow/star variation. */
export function paintRect(ctx, item, x, y, w, h, i = 0) {
  const main = item?.value || "#b6ff00";
  const alt = item?.alt || "#0a0a0b";
  const pattern = item?.pattern || "solid";

  if (pattern === "rainbow") {
    ctx.fillStyle = hueAt(i);
    ctx.fillRect(x, y, w, h);
    return;
  }

  ctx.fillStyle = main;
  ctx.fillRect(x, y, w, h);

  if (pattern === "solid") return;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  if (pattern === "stripes") {
    ctx.fillStyle = alt;
    const step = Math.max(4, Math.round(w / 4));
    for (let sx = -h; sx < w + h; sx += step * 2) {
      ctx.beginPath();
      ctx.moveTo(x + sx, y + h);
      ctx.lineTo(x + sx + step, y + h);
      ctx.lineTo(x + sx + step + h, y);
      ctx.lineTo(x + sx + h, y);
      ctx.closePath();
      ctx.fill();
    }
  } else if (pattern === "checker") {
    ctx.fillStyle = alt;
    const s = Math.max(3, Math.round(Math.min(w, h) / 2));
    for (let cy = 0; cy < h; cy += s) {
      for (let cx = 0; cx < w; cx += s) {
        if (((cx / s) + (cy / s)) % 2 === 0) ctx.fillRect(x + cx, y + cy, s, s);
      }
    }
  } else if (pattern === "dots") {
    ctx.fillStyle = alt;
    const s = Math.max(4, Math.round(Math.min(w, h) / 3));
    for (let cy = s / 2; cy < h; cy += s * 1.4) {
      for (let cx = s / 2; cx < w; cx += s * 1.4) {
        ctx.beginPath();
        ctx.arc(x + cx, y + cy, s / 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (pattern === "chrome") {
    const grd = ctx.createLinearGradient(x, y, x + w, y + h);
    grd.addColorStop(0, main);
    grd.addColorStop(0.45, alt);
    grd.addColorStop(0.55, main);
    grd.addColorStop(1, alt);
    ctx.fillStyle = grd;
    ctx.fillRect(x, y, w, h);
  } else if (pattern === "stars") {
    ctx.fillStyle = alt;
    for (let k = 0; k < 5; k++) {
      const sx = x + ((k * 37 + i * 13) % Math.max(1, w));
      const sy = y + ((k * 53 + i * 7) % Math.max(1, h));
      ctx.fillRect(sx, sy, 2, 2);
    }
  }

  ctx.restore();
}

/** CSS background for shop swatches and DOM elements (roulette table etc). */
export function swatchCss(item) {
  if (!item) return { background: "#101012" };
  const main = item.value;
  const alt = item.alt || "#0a0a0b";
  switch (item.pattern) {
    case "stripes":
      return { background: `repeating-linear-gradient(45deg, ${main} 0 10px, ${alt} 10px 20px)` };
    case "checker":
      return {
        backgroundColor: main,
        backgroundImage: `linear-gradient(45deg, ${alt} 25%, transparent 25%, transparent 75%, ${alt} 75%), linear-gradient(45deg, ${alt} 25%, transparent 25%, transparent 75%, ${alt} 75%)`,
        backgroundSize: "18px 18px",
        backgroundPosition: "0 0, 9px 9px",
      };
    case "dots":
      return {
        backgroundColor: main,
        backgroundImage: `radial-gradient(${alt} 28%, transparent 30%)`,
        backgroundSize: "12px 12px",
      };
    case "chrome":
      return { background: `linear-gradient(135deg, ${main} 0%, ${alt} 40%, ${main} 55%, ${alt} 100%)` };
    case "rainbow":
      return { background: "linear-gradient(90deg, #ff0066, #ffbf00, #b6ff00, #00e5ff, #7c5cff, #ff2fb9)" };
    case "stars":
      return {
        backgroundColor: main,
        backgroundImage: `radial-gradient(${alt} 1px, transparent 1.5px), radial-gradient(${alt} 1px, transparent 1.5px)`,
        backgroundSize: "22px 22px, 16px 16px",
        backgroundPosition: "0 0, 8px 11px",
      };
    default:
      return { background: main };
  }
}
