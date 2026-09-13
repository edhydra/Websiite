import { useMemo, useState } from "react";

export default function WordCounter() {
  const [text, setText] = useState("");

  const stats = useMemo(() => {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const sentences = trimmed ? (trimmed.match(/[.!?]+(\s|$)/g) || []).length || 1 : 0;
    const paragraphs = trimmed ? trimmed.split(/\n{2,}/).filter((p) => p.trim()).length : 0;
    const chars = text.length;
    const noSpaces = text.replace(/\s/g, "").length;
    const readMins = Math.max(words ? 1 : 0, Math.round(words / 200));
    const speakMins = Math.max(words ? 1 : 0, Math.round(words / 130));
    const longest = trimmed
      ? trimmed.split(/\s+/).reduce((a, w) => (w.length > a.length ? w : a), "")
      : "—";
    return { words, sentences, paragraphs, chars, noSpaces, readMins, speakMins, longest };
  }, [text]);

  return (
    <div className="eb-tool" data-testid="tool-wordcounter">
      <textarea
        className="eb-field eb-bigtext"
        placeholder="paste your essay / homework here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        data-testid="wc-input"
      />
      <div className="eb-stat-grid">
        <div className="eb-stat"><b data-testid="wc-words">{stats.words}</b><span>words</span></div>
        <div className="eb-stat"><b data-testid="wc-chars">{stats.chars}</b><span>characters</span></div>
        <div className="eb-stat"><b>{stats.noSpaces}</b><span>chars (no spaces)</span></div>
        <div className="eb-stat"><b data-testid="wc-sentences">{stats.sentences}</b><span>sentences</span></div>
        <div className="eb-stat"><b>{stats.paragraphs}</b><span>paragraphs</span></div>
        <div className="eb-stat"><b>{stats.readMins}</b><span>min to read</span></div>
        <div className="eb-stat"><b>{stats.speakMins}</b><span>min to read aloud</span></div>
        <div className="eb-stat"><b className="eb-stat-word">{stats.longest}</b><span>longest word</span></div>
      </div>
      <div className="eb-controls">
        <button className="eb-toggle" onClick={() => navigator.clipboard?.writeText(text)} data-testid="wc-copy">COPY TEXT</button>
        <button className="eb-toggle" onClick={() => setText("")} data-testid="wc-clear">CLEAR</button>
      </div>
    </div>
  );
}
