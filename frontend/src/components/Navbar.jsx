import { Coins, LogIn } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import A11yMenu from "@/components/A11yMenu";

export default function Navbar({ tabs, tab, onTab, soundOn, onToggleSound, sfx, onAccount }) {
  const { user } = useAuth();

  return (
    <nav className="eb-nav" data-testid="navbar">
      <button className="eb-nav-logo" onClick={() => { sfx.click(); onTab("home"); }} onMouseEnter={sfx.hover}>
        edwardlongiscool<span className="eb-blink">_</span>
      </button>
      <div className="eb-nav-links" data-testid="tabs">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            data-testid={`tab-${id}`}
            className={`eb-nav-link ${tab === id ? "active" : ""}`}
            onClick={() => { sfx.click(); onTab(id); }}
            onMouseEnter={sfx.hover}
          >
            {label}
          </button>
        ))}
      </div>

      {user ? (
        <button className="eb-account" onClick={onAccount} data-testid="account-chip">
          ★ {user.username} <span className="eb-coin-pill"><Coins size={12} /> {user.coins}</span>
        </button>
      ) : (
        <button className="eb-account" onClick={onAccount} data-testid="login-btn">
          <LogIn size={13} /> LOG IN
        </button>
      )}

      <button
        data-testid="sound-toggle"
        className={`eb-sound ${soundOn ? "on" : ""}`}
        onClick={onToggleSound}
        title="Toggle sound"
      >
        {soundOn ? "♪ SND:ON" : "✕ SND:OFF"}
      </button>

      <A11yMenu />
    </nav>
  );
}
