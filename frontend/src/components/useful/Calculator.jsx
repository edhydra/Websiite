import { useState } from "react";

const KEYS = [
  ["7", "8", "9", "/", "sin("],
  ["4", "5", "6", "*", "cos("],
  ["1", "2", "3", "-", "tan("],
  ["0", ".", "^", "+", "sqrt("],
  ["(", ")", "pi", "e", "log("],
];

const FUNCS = {
  "sin(": "Math.sin(",
  "cos(": "Math.cos(",
  "tan(": "Math.tan(",
  "sqrt(": "Math.sqrt(",
  "log(": "Math.log10(",
  "ln(": "Math.log(",
  "abs(": "Math.abs(",
};

function evaluate(expr) {
  let js = expr.replace(/\s+/g, "");
  Object.entries(FUNCS).forEach(([k, v]) => { js = js.split(k).join(v); });
  js = js.replace(/\bpi\b/g, "Math.PI").replace(/(?<![a-zA-Z0-9_.])e(?![a-zA-Z0-9_(])/g, "Math.E");
  js = js.replace(/\^/g, "**");
  if (!/^[0-9+\-*/().,%** MathPIElogsqrtincoab]*$/.test(js.replace(/Math\.[a-zA-Z0-9]+/g, ""))) {
    throw new Error("bad expression");
  }
  // eslint-disable-next-line no-new-func
  const val = Function(`"use strict";return (${js})`)();
  if (typeof val !== "number" || Number.isNaN(val)) throw new Error("bad expression");
  return val;
}

function Quadratic() {
  const [a, setA] = useState("1");
  const [b, setB] = useState("-3");
  const [c, setC] = useState("2");

  const A = Number(a), B = Number(b), C = Number(c);
  const valid = a !== "" && b !== "" && c !== "" && A !== 0 && ![A, B, C].some(Number.isNaN);
  const disc = valid ? B * B - 4 * A * C : null;
  const round = (n) => Math.round(n * 10000) / 10000;

  let answer = null;
  if (valid) {
    if (disc > 0) {
      answer = [round((-B + Math.sqrt(disc)) / (2 * A)), round((-B - Math.sqrt(disc)) / (2 * A))];
    } else if (disc === 0) {
      answer = [round(-B / (2 * A))];
    } else {
      const re = round(-B / (2 * A));
      const im = round(Math.sqrt(-disc) / (2 * A));
      answer = [`${re} + ${im}i`, `${re} − ${im}i`];
    }
  }

  return (
    <div className="eb-quad" data-testid="quadratic-solver">
      <h4>QUADRATIC SOLVER — ax² + bx + c = 0</h4>
      <div className="eb-quad-row">
        <input className="eb-field eb-field-xs" value={a} onChange={(e) => setA(e.target.value)} data-testid="quad-a" placeholder="a" />
        <span>x² +</span>
        <input className="eb-field eb-field-xs" value={b} onChange={(e) => setB(e.target.value)} data-testid="quad-b" placeholder="b" />
        <span>x +</span>
        <input className="eb-field eb-field-xs" value={c} onChange={(e) => setC(e.target.value)} data-testid="quad-c" placeholder="c" />
        <span>= 0</span>
      </div>
      {!valid ? (
        <div className="eb-muted">enter a, b and c (a can't be 0)</div>
      ) : (
        <div className="eb-quad-out" data-testid="quad-result">
          <div>discriminant b² − 4ac = <b>{round(disc)}</b></div>
          <div>{disc > 0 ? "two real roots" : disc === 0 ? "one repeated root" : "no real roots (complex)"}</div>
          <div>x = {answer.map((r, i) => <b key={i}>{r}{i < answer.length - 1 ? "  or  " : ""}</b>)}</div>
          <div className="eb-muted">working: x = (−b ± √(b²−4ac)) / 2a = (−{B} ± √{round(disc)}) / {2 * A}</div>
        </div>
      )}
    </div>
  );
}

export default function Calculator() {
  const [expr, setExpr] = useState("");
  const [out, setOut] = useState("");
  const [err, setErr] = useState("");
  const [history, setHistory] = useState([]);

  const run = () => {
    if (!expr.trim()) return;
    try {
      const v = evaluate(expr);
      const shown = String(Math.round(v * 1e10) / 1e10);
      setOut(shown);
      setErr("");
      setHistory((h) => [`${expr} = ${shown}`, ...h].slice(0, 8));
    } catch (e) {
      setErr("can't work that one out — check the brackets");
      setOut("");
    }
  };

  return (
    <div className="eb-tool" data-testid="tool-calculator">
      <div className="eb-calc">
        <input
          className="eb-field eb-calc-display"
          value={expr}
          placeholder="e.g. 3*(4+2)^2 or sqrt(144) or sin(pi/2)"
          onChange={(e) => setExpr(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          data-testid="calc-input"
        />
        <div className="eb-calc-out" data-testid="calc-output">{err ? <span className="eb-err">{err}</span> : out || "—"}</div>

        <div className="eb-calc-keys">
          {KEYS.map((row, i) => (
            <div key={i} className="eb-calc-row">
              {row.map((k) => (
                <button key={k} className="eb-key" onClick={() => setExpr((s) => s + k)} data-testid={`key-${k.replace("(", "")}`}>{k.replace("(", "")}</button>
              ))}
            </div>
          ))}
          <div className="eb-calc-row">
            <button className="eb-key wide" onClick={() => setExpr("")} data-testid="calc-clear">CLEAR</button>
            <button className="eb-key" onClick={() => setExpr((s) => s.slice(0, -1))} data-testid="calc-back">DEL</button>
            <button className="eb-key eq" onClick={run} data-testid="calc-equals">=</button>
          </div>
        </div>

        {history.length > 0 && (
          <div className="eb-calc-hist" data-testid="calc-history">
            {history.map((h, i) => <div key={i}>{h}</div>)}
          </div>
        )}
      </div>

      <Quadratic />
    </div>
  );
}
