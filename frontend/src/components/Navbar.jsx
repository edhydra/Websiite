import { SPRITES } from "@/data/assets";

const LINKS = [
  ["home", "HOME"],
  ["about", "ABOUT"],
  ["garage", "GARAGE"],
  ["retro", "RETRO"],
  ["photos", "PHOTOS"],
  ["wall", "WALL"],
  ["guestbook", "GUESTBOOK"],
];

export default function Navbar({ soundOn, onToggleSound, sfx }) {
  const go = (id) => {
    sfx.click();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <nav className="eb-nav" data-testid="navbar">
      <button className="eb-nav-logo" onClick={() => go("home")} onMouseEnter={sfx.hover}>
        <img src={SPRITES.edward} alt="" className="eb-nav-face pixelated" />
        edwardlongiscool<span className="eb-blink">_</span>
      </button>
      <div className="eb-nav-links">
        {LINKS.map(([id, label]) => (
          <button
            key={id}
            data-testid={`nav-${id}`}
            className="eb-nav-link"
            onClick={() => go(id)}
            onMouseEnter={sfx.hover}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        data-testid="sound-toggle"
        className={`eb-sound ${soundOn ? "on" : ""}`}
        onClick={onToggleSound}
        title="Toggle sound"
      >
        {soundOn ? "♪ SND:ON" : "✕ SND:OFF"}
      </button>
    </nav>
  );
}
