import { SPRITES, CAR_PHOTOS, RETRO_PHOTOS } from "@/data/assets";
import { Sparkles, Cpu, Car, Zap, Terminal, Github, Mail } from "lucide-react";

export const Hero = () => (
  <section id="home" className="eb-hero" data-testid="section-hero">
    <div className="eb-hero-inner">
      <div className="eb-chip"><Sparkles size={14} /> EDWARD-BOT IS ONLINE</div>
      <h1 className="eb-h1">
        EDWARD<br />
        <span className="eb-h1-accent">LONG</span><br />
        IS COOL
      </h1>
      <p className="eb-sub">
        a personal playground of jokes, cool stuff, cars &amp; an in-house AI.
        land rovers &gt; electric cars. tap the bot in the corner and start chatting.
      </p>
      <div className="eb-hint">→ psst: hit <b>/</b> or <b>`</b> to open the secret command bar</div>
    </div>
    <img src={SPRITES.edward} alt="pixel edward" className="eb-hero-sprite pixelated" data-testid="hero-sprite" />
  </section>
);

export const About = () => (
  <section id="about" className="eb-section" data-testid="section-about">
    <h2 className="eb-h2"><Sparkles size={22} /> ABOUT</h2>
    <div className="eb-about-grid">
      <div className="eb-panel">
        <p>yo. this is edward's corner of the internet. it's loud, it's pixelated, and it runs on
        chiptunes and land rover fumes.</p>
        <p>expect: cool stuff, dumb jokes, retro tech, cars that aren't electric, and an AI that
        thinks edward is genuinely epic (because he is — tall too).</p>
        <ul className="eb-list">
          <li><Car size={14} /> land rovers &amp; fords enjoyer</li>
          <li><Zap size={14} /> electric cars? hard pass</li>
          <li><Cpu size={14} /> beige box computing appreciator</li>
        </ul>
      </div>
      <img src={SPRITES.crt} alt="retro computer" className="eb-about-img pixelated" />
    </div>
  </section>
);

export const Garage = () => (
  <section id="garage" className="eb-section eb-garage" data-testid="section-garage">
    <h2 className="eb-h2"><Car size={22} /> THE GARAGE</h2>
    <p className="eb-section-sub">real machines only. no batteries. the good stuff.</p>

    {/* moving pixel cars driving across the road */}
    <div className="eb-road" data-testid="driving-road">
      <div className="eb-road-line" />
      <img src={SPRITES.landrover} alt="" className="eb-drive eb-drive-1 pixelated" />
      <img src={SPRITES.ford} alt="" className="eb-drive eb-drive-2 pixelated" />
      <img src={SPRITES.f1} alt="" className="eb-drive eb-drive-3 pixelated" />
    </div>

    <div className="eb-car-cards">
      {[
        { img: SPRITES.landrover, name: "LAND ROVER DISCOVERY", tag: "green // '93 legend" },
        { img: SPRITES.landroverGrey, name: "DISCOVERY (GREY)", tag: "understated // still epic" },
        { img: SPRITES.ford, name: "FORD BRONCO", tag: "classic red // v8 heart" },
        { img: SPRITES.f1, name: "F1 CAR", tag: "no.12 // full send" },
      ].map((c) => (
        <div key={c.name} className="eb-car-card" data-testid={`car-${c.name}`}>
          <img src={c.img} alt={c.name} className="pixelated" />
          <div className="eb-car-name">{c.name}</div>
          <div className="eb-car-tag">{c.tag}</div>
        </div>
      ))}
    </div>

    <div className="eb-gallery">
      {CAR_PHOTOS.map((p, i) => (
        <figure key={i} className="eb-shot">
          <img src={p.url} alt={p.cap} className="pixelated" loading="lazy" />
          <figcaption>{p.cap}</figcaption>
        </figure>
      ))}
    </div>
  </section>
);

export const RetroTech = () => (
  <section id="retro" className="eb-section" data-testid="section-retro">
    <h2 className="eb-h2"><Terminal size={22} /> RETRO TECH</h2>
    <p className="eb-section-sub">beige boxes, CRT glow, and the sound of a 56k modem.</p>
    <div className="eb-crt-wrap">
      <div className="eb-crt-screen" data-testid="crt-terminal">
        <pre>{`C:\\> edward.exe
loading cool.sys ................ OK
mounting /land_rover ............ OK
disabling electric_cars ......... OK
READY_
> _`}</pre>
      </div>
    </div>
    <div className="eb-gallery">
      {RETRO_PHOTOS.map((p, i) => (
        <figure key={i} className="eb-shot">
          <img src={p.url} alt={p.cap} className="pixelated" loading="lazy" />
          <figcaption>{p.cap}</figcaption>
        </figure>
      ))}
    </div>
  </section>
);

export const Photos = () => (
  <section id="photos" className="eb-section" data-testid="section-photos">
    <h2 className="eb-h2"><Sparkles size={22} /> LINKS</h2>
    <div className="eb-links-grid">
      <a className="eb-linkcard" href="#garage" data-testid="link-garage"><Car size={18} /> the garage</a>
      <a className="eb-linkcard" href="#retro" data-testid="link-retro"><Cpu size={18} /> retro tech</a>
      <a className="eb-linkcard" href="mailto:hi@edwardlongiscool.com" data-testid="link-mail"><Mail size={18} /> say hi</a>
      <a className="eb-linkcard" href="https://github.com" target="_blank" rel="noreferrer" data-testid="link-gh"><Github size={18} /> github</a>
    </div>
  </section>
);
