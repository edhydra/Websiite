import { useEffect, useRef, useState } from "react";
import "@/App.css";
import "@/extras.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Hero, About } from "@/components/Sections";
import Games from "@/components/Games";
import Useful from "@/components/Useful";
import WallOfFame from "@/components/WallOfFame";
import Guestbook from "@/components/Guestbook";
import Footer from "@/components/Footer";
import CommandBar from "@/components/CommandBar";
import AuthModal from "@/components/AuthModal";
import ThemeSync from "@/components/ThemeSync";
import { AuthProvider } from "@/context/AuthContext";
import { useSound } from "@/hooks/useSound";

const TABS = [
  ["home", "HOME"],
  ["games", "GAMES"],
  ["useful", "USEFUL STUFF"],
  ["wall", "WALL OF FAME"],
  ["guestbook", "GUESTBOOK"],
];

const Home = () => {
  const [soundOn, setSoundOn] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [tab, setTab] = useState(() => {
    const h = window.location.hash.replace("#", "");
    return TABS.some(([id]) => id === h) ? h : "home";
  });
  const soundRef = useRef(false);
  const sfx = useSound(soundRef);

  useEffect(() => { document.title = "edwardlongiscool.com"; }, []);
  useEffect(() => { soundRef.current = soundOn; }, [soundOn]);

  const go = (id) => {
    setTab(id);
    window.location.hash = id;
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.replace("#", "");
      setTab(TABS.some(([id]) => id === h) ? h : "home");
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <div className="eb-landing" data-testid="home">
      <ThemeSync />
      <div className="eb-grid-bg" />
      <div className="eb-marquee-top">
        <span>★ welcome ★ cool stuff inside ★ play the games, earn coins ★ hit / for secrets ★ </span>
      </div>
      <Navbar
        tabs={TABS}
        tab={tab}
        onTab={go}
        soundOn={soundOn}
        onToggleSound={() => { setSoundOn((s) => !s); sfx.click(); }}
        sfx={sfx}
        onAccount={() => setAuthOpen(true)}
      />

      <main data-testid={`tabpanel-${tab}`}>
        {tab === "home" && <><Hero onTab={go} /><About onTab={go} /></>}
        {tab === "games" && <Games onLogin={() => setAuthOpen(true)} />}
        {tab === "useful" && <Useful onLogin={() => setAuthOpen(true)} />}
        {tab === "wall" && <WallOfFame sfx={sfx} />}
        {tab === "guestbook" && <Guestbook sfx={sfx} />}
      </main>

      <Footer />
      <CommandBar sfx={sfx} />
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
