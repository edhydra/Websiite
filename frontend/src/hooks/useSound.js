import { useRef } from "react";

// Tiny WebAudio blip generator — no asset files. Off by default until enabled.
export function useSound(enabledRef) {
  const ctxRef = useRef(null);

  const beep = (freq = 660, dur = 0.05, type = "square", vol = 0.04) => {
    if (!enabledRef.current) return;
    try {
      if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = ctxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = vol;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.stop(ctx.currentTime + dur);
    } catch (e) { /* ignore */ }
  };

  return {
    hover: () => beep(880, 0.03, "square", 0.02),
    click: () => beep(440, 0.07, "square", 0.05),
    good: () => { beep(660, 0.06); setTimeout(() => beep(990, 0.09), 60); },
  };
}
