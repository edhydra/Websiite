# edwardlongiscool.com — PRD

## Original Problem Statement
Personality-driven "cool stuff" site (hybrid brutalist + Y2K). Tabs: Home, Games, Useful Stuff, Wall of Fame, Guestbook. Games (Snake, Flappy, Pong, Whack-a-Mole, Minesweeper, Clicker, Paint, Roulette). Coin economy + cosmetic shop (site themes + game skins). Auth (JWT). Command bar easter eggs. Accessibility menu. NO car/garage UI content anywhere.

## Architecture
- Frontend: React 19, tab-based layout, Y2K/brutalist theme, dynamic CSS-variable theming via `ThemeSync.jsx`.
- Backend: FastAPI, `/api` prefix. MongoDB via motor.
- Auth: Custom JWT (cookies), integration playbook-based.

## Implemented (2026-02)
- Tab layout (Home, Games, Useful, Wall of Fame, Guestbook)
- 8 playable games with leaderboards
- Useful tab: Word Counter, Calculator, Periodic Table, Revision Links, Flashcards (saved to account)
- Coin economy + shop (site themes + game skins, buy/equip)
- Command Bar cheat codes: Metchog (1000), Edward (100), ADMIN11 (90000), Piastri (papaya theme unlock), YAY! (confetti)
- Accessibility menu (top-right)
- Guestbook, Wall of Fame (seeded OG names), visitor counter

## Removed (2026-02)
- **Edward-bot AI chatbot**: fully removed at user request to eliminate Universal Key credit usage.
  - Deleted `frontend/src/components/EdwardBot.jsx`
  - Removed FAB / chat window / API calls
  - Removed backend routes `/api/ai/chat`, `/api/ai/history/{sid}` (GET & DELETE)
  - Removed `EDWARD_SYSTEM_PROMPT`, `MODEL_CHAIN`, AI rate-limiter, `emergentintegrations` import from `server.py`
  - Cleaned copy: hero chip → "WELCOME", marquee/about no longer mention AI, command bar `credits` output updated
  - `EMERGENT_LLM_KEY` env var kept in place (unused) — safe to leave

## Backlog
- P2: Audio layer — background chiptune loop (off by default, top-right toggle) + hover/click SFX
- P2: Admin delete panel for guestbook/wall
- P3: Additional cosmetic themes / skins as content updates

## Notes
- Design rule: NEVER add car/garage UI content.
- Themes controlled via CSS variables in `/app/frontend/src/lib/themes.js` and injected by `ThemeSync.jsx` — don't hardcode colors in `App.css`.
