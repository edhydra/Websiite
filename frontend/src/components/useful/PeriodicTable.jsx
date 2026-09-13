import { useState } from "react";
import { ELEMENTS, CATEGORY_COLOURS, CATEGORY_LABELS } from "@/data/elements";

export default function PeriodicTable() {
  const [sel, setSel] = useState(ELEMENTS[5]);
  const [q, setQ] = useState("");

  const match = (el) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return el.name.toLowerCase().includes(s) || el.symbol.toLowerCase() === s || String(el.number) === s;
  };

  return (
    <div className="eb-tool" data-testid="tool-periodic">
      <div className="eb-controls">
        <input
          className="eb-field eb-field-sm"
          placeholder="search element..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          data-testid="pt-search"
        />
        <div className="eb-pt-sel" data-testid="pt-selected">
          <b>{sel.number} · {sel.symbol}</b> {sel.name} — {CATEGORY_LABELS[sel.category]} · mass {sel.mass} · group {sel.category === "lanthanide" || sel.category === "actinide" ? "f-block" : sel.group} · period {sel.period}
        </div>
      </div>

      <div className="eb-pt" data-testid="pt-grid">
        {ELEMENTS.map((el) => (
          <button
            key={el.number}
            className={`eb-pt-cell ${match(el) ? "" : "dim"} ${sel.number === el.number ? "on" : ""}`}
            style={{ gridColumn: el.col, gridRow: el.row, borderColor: CATEGORY_COLOURS[el.category] }}
            onClick={() => setSel(el)}
            data-testid={`pt-${el.symbol}`}
            title={el.name}
          >
            <small>{el.number}</small>
            <span style={{ color: CATEGORY_COLOURS[el.category] }}>{el.symbol}</span>
          </button>
        ))}
      </div>

      <div className="eb-pt-legend">
        {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
          <span key={k}><i style={{ background: CATEGORY_COLOURS[k] }} /> {label}</span>
        ))}
      </div>
    </div>
  );
}
