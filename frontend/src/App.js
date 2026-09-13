import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import EdwardBot from "@/components/EdwardBot";
import { Sparkles } from "lucide-react";

const Home = () => {
  useEffect(() => {
    document.title = "edwardlongiscool.com";
  }, []);

  return (
    <div className="eb-landing" data-testid="home">
      <div className="eb-grid-bg" />
      <header className="eb-topbar">
        <div className="eb-logo">edwardlongiscool<span className="eb-blink">_</span></div>
        <div className="eb-marquee">
          <span>★ welcome ★ cool stuff inside ★ ask edward-bot anything ★ land rovers &gt; electric cars ★ </span>
        </div>
      </header>

      <main className="eb-hero">
        <div className="eb-hero-inner">
          <div className="eb-chip"><Sparkles size={14} /> EDWARD-BOT IS ONLINE</div>
          <h1 className="eb-h1">
            EDWARD<br />
            <span className="eb-h1-accent">LONG</span><br />
            IS COOL
          </h1>
          <p className="eb-sub">
            a personal playground of jokes, cool stuff, games &amp; an in-house AI.
            tap the bot in the corner and start chatting.
          </p>
          <div className="eb-hint">
            → click the <b>bot button</b> bottom-right to talk to Edward-bot
          </div>
        </div>
      </main>

      <EdwardBot />
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
