import { useEffect, useRef, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Hero, About, Garage, RetroTech, Photos } from "@/components/Sections";
import WallOfFame from "@/components/WallOfFame";
import Guestbook from "@/components/Guestbook";
import Footer from "@/components/Footer";
import CommandBar from "@/components/CommandBar";
import EdwardBot from "@/components/EdwardBot";
import { useSound } from "@/hooks/useSound";

const Home = () => {
  const [soundOn, setSoundOn] = useState(false);
  const soundRef = useRef(false);
  const sfx = useSound(soundRef);

  useEffect(() => { document.title = "edwardlongiscool.com"; }, []);
  useEffect(() => { soundRef.current = soundOn; }, [soundOn]);

  return (
    <div className="eb-landing" data-testid="home">
      <div className="eb-grid-bg" />
      <div className="eb-marquee-top">
        <span>★ welcome ★ cool stuff inside ★ ask edward-bot anything ★ land rovers &gt; electric cars ★ hit / for secrets ★ </span>
      </div>
      <Navbar soundOn={soundOn} onToggleSound={() => { setSoundOn((s) => !s); sfx.click(); }} sfx={sfx} />

      <main>
        <Hero />
        <About />
        <Garage />
        <RetroTech />
        <Photos />
        <WallOfFame sfx={sfx} />
        <Guestbook sfx={sfx} />
      </main>

      <Footer />
      <CommandBar sfx={sfx} />
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
