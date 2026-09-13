# edwardlongiscool.com — PRD

## Original Problem Statement
Personality-driven "cool stuff" site (brutalist + Y2K). Full spec includes sections (landing, about, projects, photos, wall of fame, guestbook), auth (Google + email/password), games (5), Edward-bot AI, easter eggs, audio. Built incrementally.

## User's Explicit Request (this session)
"Add the Claude AI Models integration to my app." → Edward-bot AI implemented first.

## Architecture
- Frontend: React 19 + Tailwind + Framer Motion, Space Mono / VT323 fonts. Y2K/brutalist theme.
- Backend: FastAPI, `/api` prefix, SSE streaming.
- DB: MongoDB (`ai_chats` collection for chat history).
- AI: Claude Sonnet 5 (primary) → GPT 5.4 Mini (fallback) via emergentintegrations + EMERGENT_LLM_KEY. No key exposed to client.

## Implemented (2026-09-13)
- Edward-bot AI: server-side streaming proxy `/api/ai/chat`, history `/api/ai/history/{sid}` (GET/DELETE).
- Personality system prompt: Edward = cool/tall/epic; loves Land Rover/Ford, dislikes EVs (worked in naturally); otherwise fully helpful assistant.
- Frontend floating chat widget (bottom-right FAB) with Y2K chrome styling, streaming render, markdown (react-markdown + remark-gfm), copy button, clear chat.
- Per-IP anon rate limit (20/hour).
- Session persistence via localStorage session id + Mongo history.
- Themed landing hero (placeholder copy — to be replaced with verbatim original text later).

## Backlog (P0/P1)
- P0: Port real sections with verbatim original copy (crawl edwardlongiscool.com) — About, Projects, Photos, Wall of Fame, Guestbook.
- P0: Auth (Emergent Google + email/password JWT) → tie AI history/leaderboards to accounts, higher rate limits.
- P1: 5 games with Mongo leaderboards.
- P1: Easter eggs (command bar, konami), visitor counter, audio layer.
- P2: Admin delete panel, email verification.

## Notes
- Existing site copy/assets NOT yet imported (user hasn't provided source). Landing uses placeholder text.
