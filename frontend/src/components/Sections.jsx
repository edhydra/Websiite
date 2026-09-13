import { Sparkles, Gamepad2, Trophy, BookOpen, Mail, GraduationCap } from "lucide-react";

export const Hero = ({ onTab }) => (
  <section className="eb-hero" data-testid="section-hero">
    <div className="eb-hero-inner">
      <div className="eb-chip"><Sparkles size={14} /> EDWARD-BOT IS ONLINE</div>
      <h1 className="eb-h1">
        EDWARD<br />
        <span className="eb-h1-accent">LONG</span><br />
        IS COOL
      </h1>
      <p className="eb-sub">
        a personal playground of jokes, games and cool stuff, with an in-house AI.
        tap the bot in the corner and start chatting.
      </p>
      <div className="eb-hero-cta">
        <button className="eb-btn" onClick={() => onTab("games")} data-testid="hero-play"><Gamepad2 size={14} /> PLAY SNAKE</button>
        <button className="eb-btn" onClick={() => onTab("wall")} data-testid="hero-wall"><Trophy size={14} /> WALL OF FAME</button>
      </div>
      <div className="eb-hint">→ psst: hit <b>/</b> or <b>`</b> to open the secret command bar</div>
    </div>
  </section>
);

export const About = ({ onTab }) => (
  <section className="eb-section" data-testid="section-about">
    <h2 className="eb-h2"><Sparkles size={22} /> ABOUT</h2>
    <div className="eb-about-grid">
      <div className="eb-panel">
        <p>yo. this is edward's corner of the internet. it's loud, it's a bit chaotic, and it runs on
        chiptunes and pure confidence.</p>
        <p>expect: cool stuff, dumb jokes, actual playable games, a wall of certified cool people, and
        an AI that thinks edward is genuinely epic (because he is — tall too).</p>
        <ul className="eb-list">
          <li><Gamepad2 size={14} /> games with real leaderboards</li>
          <li><Trophy size={14} /> the wall of fame — get your name on it</li>
          <li><BookOpen size={14} /> sign the guestbook before you leave</li>
        </ul>
      </div>
      <div className="eb-links-grid eb-links-stack">
        <button className="eb-linkcard" onClick={() => onTab("games")} data-testid="link-games"><Gamepad2 size={18} /> games</button>
        <button className="eb-linkcard" onClick={() => onTab("wall")} data-testid="link-wall"><Trophy size={18} /> wall of fame</button>
        <button className="eb-linkcard" onClick={() => onTab("useful")} data-testid="link-useful"><GraduationCap size={18} /> useful stuff</button>
        <a className="eb-linkcard" href="mailto:hi@edwardlongiscool.com" data-testid="link-mail"><Mail size={18} /> say hi</a>
      </div>
    </div>
  </section>
);
