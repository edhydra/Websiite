import { useState } from "react";
import { Gamepad2 } from "lucide-react";
import Snake from "@/components/games/Snake";
import Flappy from "@/components/games/Flappy";
import Pong from "@/components/games/Pong";
import WhackAMole from "@/components/games/WhackAMole";
import Minesweeper from "@/components/games/Minesweeper";
import Clicker from "@/components/games/Clicker";
import Paint from "@/components/games/Paint";
import Roulette from "@/components/games/Roulette";
import Shop from "@/components/Shop";

const GAMES = [
  ["snake", "SNAKE", "eat, grow, don't bite yourself"],
  ["flappy", "FLAPPY", "tap to flap, mind the pipes"],
  ["pong", "PONG", "first to 7 against the cpu"],
  ["whack", "WHACK-A-MOLE", "30 seconds of chaos"],
  ["minesweeper", "MINESWEEPER", "10x10, 14 mines"],
  ["clicker", "CLICKER", "20 second click race"],
  ["paint", "PAINT", "draw whatever, save it"],
  ["roulette", "ROULETTE", "bet your coins"],
  ["shop", "SHOP", "skins & table themes"],
];

export default function Games({ onLogin }) {
  const [pick, setPick] = useState("snake");

  return (
    <section className="eb-section" data-testid="section-games">
      <h2 className="eb-h2"><Gamepad2 size={22} /> GAMES</h2>
      <p className="eb-section-sub">real playable stuff. scores go on the board, and playing earns coins when you're logged in.</p>

      <div className="eb-game-picker" data-testid="game-picker">
        {GAMES.map(([id, name, tag]) => (
          <button
            key={id}
            className={`eb-pick ${pick === id ? "on" : ""}`}
            onClick={() => setPick(id)}
            data-testid={`pick-${id}`}
          >
            <span className="eb-pick-name">{name}</span>
            <small>{tag}</small>
          </button>
        ))}
      </div>

      <div className="eb-game-stage">
        {pick === "snake" && <Snake />}
        {pick === "flappy" && <Flappy />}
        {pick === "pong" && <Pong />}
        {pick === "whack" && <WhackAMole />}
        {pick === "minesweeper" && <Minesweeper />}
        {pick === "clicker" && <Clicker />}
        {pick === "paint" && <Paint />}
        {pick === "roulette" && <Roulette onLogin={onLogin} />}
        {pick === "shop" && <Shop onLogin={onLogin} />}
      </div>
    </section>
  );
}
