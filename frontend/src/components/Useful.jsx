import { useState } from "react";
import { GraduationCap } from "lucide-react";
import WordCounter from "@/components/useful/WordCounter";
import Flashcards from "@/components/useful/Flashcards";
import Calculator from "@/components/useful/Calculator";
import PeriodicTable from "@/components/useful/PeriodicTable";
import RevisionLinks from "@/components/useful/RevisionLinks";

const TOOLS = [
  ["words", "WORD COUNTER", "essay word + character count"],
  ["cards", "FLASHCARDS", "make them, save them, test yourself"],
  ["calc", "CALCULATOR", "scientific + quadratic solver"],
  ["table", "PERIODIC TABLE", "all 118, tap for details"],
  ["links", "REVISION SITES", "seneca, corbettmaths & co."],
];

export default function Useful({ onLogin }) {
  const [pick, setPick] = useState("words");

  return (
    <section className="eb-section" data-testid="section-useful">
      <h2 className="eb-h2"><GraduationCap size={22} /> STUFF THAT'S ACTUALLY USEFUL</h2>
      <p className="eb-section-sub">school survival kit. no fluff, all of it works.</p>

      <div className="eb-game-picker" data-testid="tool-picker">
        {TOOLS.map(([id, name, tag]) => (
          <button
            key={id}
            className={`eb-pick ${pick === id ? "on" : ""}`}
            onClick={() => setPick(id)}
            data-testid={`tool-${id}`}
          >
            <span className="eb-pick-name">{name}</span>
            <small>{tag}</small>
          </button>
        ))}
      </div>

      <div className="eb-game-stage">
        {pick === "words" && <WordCounter />}
        {pick === "cards" && <Flashcards onLogin={onLogin} />}
        {pick === "calc" && <Calculator />}
        {pick === "table" && <PeriodicTable />}
        {pick === "links" && <RevisionLinks />}
      </div>
    </section>
  );
}
