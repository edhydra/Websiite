import { useEffect, useState } from "react";
import { Accessibility, X } from "lucide-react";

const DEFAULTS = { text: "normal", contrast: "off", motion: "on", font: "default", cursor: "off" };
const KEY = "eb_a11y";

const load = () => {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
  catch { return { ...DEFAULTS }; }
};

const OPTIONS = [
  { key: "text", label: "TEXT SIZE", choices: [["normal", "100%"], ["large", "115%"], ["huge", "130%"]] },
  { key: "contrast", label: "HIGH CONTRAST", choices: [["off", "OFF"], ["on", "ON"]] },
  { key: "motion", label: "ANIMATIONS", choices: [["on", "ON"], ["off", "REDUCED"]] },
  { key: "font", label: "FONT", choices: [["default", "MONO"], ["readable", "EASY-READ"]] },
  { key: "cursor", label: "BIG CURSOR", choices: [["off", "OFF"], ["on", "ON"]] },
];

export default function A11yMenu() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(load);

  useEffect(() => {
    const root = document.documentElement;
    Object.entries(prefs).forEach(([k, v]) => { root.dataset[`a11y${k[0].toUpperCase()}${k.slice(1)}`] = v; });
    localStorage.setItem(KEY, JSON.stringify(prefs));
  }, [prefs]);

  const set = (key, val) => setPrefs((p) => ({ ...p, [key]: val }));

  return (
    <>
      <button
        className="eb-a11y-btn"
        onClick={() => setOpen((o) => !o)}
        title="Accessibility options"
        aria-label="Accessibility options"
        data-testid="a11y-toggle"
      >
        <Accessibility size={16} />
      </button>

      {open && (
        <div className="eb-a11y-panel" data-testid="a11y-panel">
          <div className="eb-a11y-head">
            ACCESSIBILITY
            <button className="eb-icon" onClick={() => setOpen(false)} data-testid="a11y-close"><X size={14} /></button>
          </div>
          {OPTIONS.map((opt) => (
            <div key={opt.key} className="eb-a11y-row">
              <span>{opt.label}</span>
              <div className="eb-a11y-choices">
                {opt.choices.map(([val, label]) => (
                  <button
                    key={val}
                    className={prefs[opt.key] === val ? "on" : ""}
                    onClick={() => set(opt.key, val)}
                    data-testid={`a11y-${opt.key}-${val}`}
                  >{label}</button>
                ))}
              </div>
            </div>
          ))}
          <button className="eb-toggle" onClick={() => setPrefs({ ...DEFAULTS })} data-testid="a11y-reset">RESET ALL</button>
        </div>
      )}
    </>
  );
}
