/** Whole-site themes bought with coins. Applied as CSS variables on <html>. */
export const THEMES = {
  site_default: { black: "#0a0a0b", white: "#f4f4f0", lime: "#b6ff00", magenta: "#ff2fb9", cyan: "#00e5ff" },
  site_mono:    { black: "#05070a", white: "#d9f5e4", lime: "#45ff8f", magenta: "#2bd97a", cyan: "#8affc4" },
  site_vapor:   { black: "#130a24", white: "#f6e9ff", lime: "#ff71ce", magenta: "#b967ff", cyan: "#05ffa1" },
  site_matrix:  { black: "#020a04", white: "#d7ffd9", lime: "#00ff41", magenta: "#0bbf3a", cyan: "#7cff9b" },
  site_sunset:  { black: "#1a0a10", white: "#fff1e6", lime: "#ff8a3d", magenta: "#ff2e63", cyan: "#ffd166" },
  site_ice:     { black: "#060f18", white: "#eaf8ff", lime: "#7ae7ff", magenta: "#4d8dff", cyan: "#c9f4ff" },
  site_bubblegum: { black: "#1b0714", white: "#fff0f8", lime: "#ff4fa3", magenta: "#ffd23f", cyan: "#66e5ff" },
  site_gold:    { black: "#100c02", white: "#fff7e0", lime: "#ffbf00", magenta: "#ff7a00", cyan: "#ffe89a" },
  site_papaya:  { black: "#140a02", white: "#fff3e6", lime: "#ff8000", magenta: "#0090d0", cyan: "#ffb066" },
};

export const DEFAULT_THEME = "site_default";
export const DEFAULT_BG = "bg_grid";

export function applyTheme(themeId, bgId) {
  const t = THEMES[themeId] || THEMES[DEFAULT_THEME];
  const root = document.documentElement;
  root.style.setProperty("--eb-black", t.black);
  root.style.setProperty("--eb-white", t.white);
  root.style.setProperty("--eb-border", t.white);
  root.style.setProperty("--eb-lime", t.lime);
  root.style.setProperty("--eb-magenta", t.magenta);
  root.style.setProperty("--eb-cyan", t.cyan);
  document.body.dataset.bg = bgId || DEFAULT_BG;
  document.body.dataset.theme = themeId || DEFAULT_THEME;
}
