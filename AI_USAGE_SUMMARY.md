# AI Usage Summary

This document summarizes how AI tools were used while building Cryptalks, as
requested by the assignment. It's written honestly: this project was built
almost entirely through an interactive session with Claude Code (Anthropic's
AI coding agent), with the developer directing scope, reviewing every change,
and making the final call on design and product decisions.

## How AI was used

### Planning

Each phase of the project (backend foundation, onboarding, dashboard shell,
feedback storage, CoinGecko integration, CryptoPanic integration, OpenRouter
integration, final polish) was scoped by the developer as a discrete, written
brief — goals, constraints, explicit exclusions ("do not add Redis," "do not
implement ML training," etc.), and quality expectations. The AI turned each
brief into a concrete implementation plan (which files to touch, what
functions to add, in what order) before writing code, so the developer could
sanity-check the approach before implementation began.

### Architecture refinement

The AI proposed and the developer approved several structural decisions during
planning, listed below under "Decisions." When the AI's first draft of an
approach didn't fit the constraints (e.g. an early cache design), it was
revised in discussion before being implemented, rather than after.

### Implementation prompts

Each backend module (`auth.py`, `preferences.py`, `dashboard.py`,
`integrations.py`, `feedback.py`) and each frontend page/component were
implemented by the AI from the developer's specifications, including:

- Exact response shapes and camelCase/snake_case field mapping
- Fallback priority ordering for each external integration (live → cache →
  static)
- The specific safety rules and forbidden/allowed phrasing for AI-generated
  content
- UI behavior details (loading states, error states, badge labels, feedback
  button behavior)

### Debugging and verification assistance

The AI ran the application end-to-end after every phase — via
`docker compose up --build`, `curl` against live endpoints, and headless
browser testing — rather than only relying on static review. This caught and
fixed several real issues during development, including:

- A coin price display bug showing raw unrounded floats (`-3.1151818494292343%`)
  instead of a rounded percentage
- A meme image with no reserved height collapsing the card layout when the
  image was slow to load
- A test script bug (not an app bug) that was misdiagnosed until traced to a
  stale wait condition
- A genuinely bad AI-insight tone (robotic meta-explanation and a redundant
  disclaimer sentence) that the developer caught by reading actual output and
  asked to be rewritten — the fix was implemented and re-verified against the
  same output the developer had flagged

External API failures (invalid CoinGecko/CryptoPanic/OpenRouter keys) were
tested against the **real** third-party APIs where possible, not simulated
mocks, to confirm fallback behavior under genuine failure conditions (e.g. a
real `401` from OpenRouter, a real `403` from CryptoPanic).

## Main decisions influenced by AI

The following architectural choices were proposed by the AI during planning
and approved by the developer:

- **Modular monolith instead of microservices** — one FastAPI backend with
  clearly separated modules (`auth`, `preferences`, `dashboard`, `feedback`,
  `integrations`), rather than splitting each concern into its own service.
  Appropriate for the project's scope; avoids unnecessary operational
  complexity.
- **PostgreSQL only** — no Redis, no additional datastores. A single
  `cached_coin_prices` table serves as the price cache; no separate caching
  layer.
- **Backend-only external API calls** — the frontend never holds or uses a
  third-party API key; every CoinGecko/CryptoPanic/OpenRouter call is made
  from the backend, keeping keys server-side and giving one place to enforce
  fallback and safety logic.
- **Fallback-first integration strategy** — every external integration
  (prices, news, AI insight) is designed so the dashboard **never** fails
  because of a third-party outage: live data is attempted first, falling back
  to cache and then to static content, always returning `200` with a
  best-effort response.
- **OpenRouter for the AI insight** — chosen for its access to a range of
  models (including free-tier options) through one API, so the project doesn't
  hardcode or require a specific paid provider.
- **Feedback stored separately from preferences** — thumbs up/down votes live
  in their own table and never modify onboarding preferences, keeping
  "explicit user choice" and "implicit behavioral signal" as distinct concepts
  for any future recommendation work.

## Developer review and final responsibility

All AI-generated code, prompts, safety rules, and copy were reviewed by the
developer before being accepted, and the developer directed multiple rounds of
revision based on actual observed behavior (not just code review) — including
the AI-insight tone rewrite described above. Testing (Docker builds, live API
calls, browser-driven end-to-end flows, and direct database inspection) was
run and its output reviewed at every phase before proceeding to the next. The
developer made the final call on all product positioning, safety wording, and
scope decisions; the AI's role was implementation and verification support
under that direction.
