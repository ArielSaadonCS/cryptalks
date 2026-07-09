# Cryptalks

Cryptalks is an AI-powered, personalized crypto briefing dashboard. It combines
onboarding preferences, live crypto prices, market news, an AI-generated daily
insight and light meme into one daily briefing per user.

> **Product positioning:** Cryptalks provides educational market context only.
> It is **not** a trading prediction app. It does not provide financial advice,
> trading signals, or buy/sell recommendations — anywhere in the product,
> including AI-generated content.

## Live deployment

- **App:** [cryptalks-beige.vercel.app](https://cryptalks-beige.vercel.app) (Vercel)
- **API:** [cryptalks-backend.onrender.com](https://cryptalks-backend.onrender.com) — interactive docs at `/docs` (Render, free tier — the first request after a period of inactivity can take 30-50s while it wakes up)
- **Database:** PostgreSQL on Render. Production intentionally runs with
  `OPENROUTER_API_KEY` unset (AI Insight uses the deterministic fallback) —
  the CORS policy is wide open and there's no rate limiting, so a public
  demo isn't the place to expose a paid, metered API key to anonymous
  traffic. Every other feature (auth, onboarding, live CoinGecko prices,
  feedback, content-type gating, etc.) runs exactly as in local dev.
- **DB access for review:** a read-only Postgres role (`cryptalks_reviewer`,
  `SELECT`-only on all tables, cannot write or drop anything) has been
  created for inspection. Its connection string is deliberately not
  included in this public repo — it's provided directly in the assignment
  submission instead.

## Features

- Signup and login with JWT authentication and bcrypt password hashing
- Backend-enforced password policy (length, character classes, no name/email
  reuse)
- Onboarding preferences (assets, investor type, content types, risk level),
  stored separately from behavioral feedback
- A personalized dashboard built from those preferences on every visit
- Real coin prices from CoinGecko, with a PostgreSQL cache and a static
  fallback so the dashboard never breaks if CoinGecko is unavailable
- Real market news from CryptoPanic (optional API key), with static fallback
  news when no key is configured or the request fails
- An AI Insight of the Day from OpenRouter (optional API key + model), with a
  deterministic fallback insight and a keyword based safety filter that
  discards any unsafe/financial-advice-flavored output. (In the public deployment,
   the fallback insight may be shown intentionally to avoid exposing the OpenRouter API key publicly.)
- A dynamic daily meme, chosen deterministically per user per day from a
  static catalog of real meme images (no external API, no database table)
  with a click-to-enlarge lightbox view
- Thumbs up/down feedback on every dashboard item, persisted in PostgreSQL,
  restored on refresh, and actively used to shape future content (see
  "Feedback vs. preferences, and what's next" below)
- Each of the 4 dashboard sections only renders if the user selected its
  content type during onboarding (`Market News`, `Charts`, `AI Insights`,
  `Fun`) — the dashboard is genuinely built from preferences, not just
  labeled by them
- Fully Dockerized: `docker compose up --build` runs the whole stack

## Tech stack

**Frontend:** React 19, TypeScript, Vite, TanStack Router (client-only, file-based
routing), Tailwind CSS v4, `lucide-react` icons (no Redux, no component library)

**Backend:** Python, FastAPI, SQLAlchemy, PostgreSQL, JWT (`python-jose`), `bcrypt`
(via `passlib`), `httpx` for outbound calls to CoinGecko / CryptoPanic /
OpenRouter

**Infrastructure:** Docker Compose with three services — `frontend`, `backend`,
`db` (PostgreSQL)

## Architecture summary

Cryptalks is a **Dockerized modular monolith**, not a microservices system:
one FastAPI process, one PostgreSQL database, one React app — each in its own
container, composed with `docker-compose.yml`. The backend is organized into
small, single-responsibility modules rather than separate services:

- **`auth.py`** — password hashing, JWT creation/validation, the
  `get_current_user` dependency
- **`preferences.py`** — onboarding preferences (`GET`/`PUT /preferences/me`)
- **`dashboard.py`** — composes the daily briefing (`GET /dashboard/today`);
  stays thin, delegating all external-service logic to `integrations.py`
- **`feedback.py`** — thumbs up/down voting (`POST /feedback`,
  `GET /feedback/me`)
- **`integrations.py`** — the only module that talks to external services
  (CoinGecko, CryptoPanic, OpenRouter), each with its own cache/fallback
  strategy; the rest of the backend never calls an external API directly

The frontend only ever calls the FastAPI backend — it never calls the
external APIs directly, and never receives or uses any
third-party API key.

## Environment variables

### Backend

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET_KEY` | Yes | Secret used to sign access tokens |
| `JWT_ALGORITHM` | No (default `HS256`) | |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No (default `60`) | |
| `COINGECKO_API_KEY` | No | Enables CoinGecko's demo-key header; the free public endpoint works without it |
| `CRYPTOPANIC_API_KEY` | No | Without it, market news uses static fallback content |
| `OPENROUTER_API_KEY` | No | Without it (or without `OPENROUTER_MODEL`), the AI insight uses a deterministic fallback |
| `OPENROUTER_MODEL` | No | Any model ID from [openrouter.ai/models](https://openrouter.ai/models), including free-tier models — nothing here requires a paid model |

### Frontend

| Variable | Required | Notes |
|---|---|---|
| `VITE_API_URL` | Yes | Base URL of the backend, e.g. `http://localhost:8000` |

All three third-party keys are optional. The app is fully functional with
none of them configured — see the "Integration details" section below for the
exact fallback behavior of each.

`docker-compose.yml` reads `COINGECKO_API_KEY`, `CRYPTOPANIC_API_KEY`,
`OPENROUTER_API_KEY`, and `OPENROUTER_MODEL` from a **root-level `.env` file**
(via `${VAR:-}` substitution, Compose's standard mechanism — no extra
config needed, it's picked up automatically since `.env` sits next to
`docker-compose.yml`). Copy `.env.example` to `.env` and fill in real values
to enable live integrations; leave it missing or blank and every integration
falls back gracefully. `.env` is gitignored — never put real keys in
`.env.example`, which is the tracked template.

## Local setup

Requirements: Docker and Docker Compose.

```bash
docker compose up --build
```

This starts three services, with working development defaults already in
`docker-compose.yml` (no `.env` file required to get started — only add one
at the project root if you want live CryptoPanic/OpenRouter, per above):

- **db** — PostgreSQL 16
- **backend** — FastAPI on **http://localhost:8000** (Swagger UI at
  **http://localhost:8000/docs**)
- **frontend** — the React/Vite app on **http://localhost:5173**

Tables are created automatically on backend startup.

To run a service outside Docker:

- **Backend:** copy `.env.example` to `backend/.env` (a separate file from
  the root-level `.env` Docker Compose uses — `config.py` loads `.env`
  relative to the working directory, which is `backend/` when running
  uvicorn directly), adjust values, then run `uvicorn app.main:app --reload`
  from `backend/` against your own Postgres instance.
- **Frontend:** copy `frontend/.env.example` to `frontend/.env`, then run
  `npm install` and `npm run dev` from `frontend/`. `src/routeTree.gen.ts` is
  auto-generated from the files in `src/routes/` on every `dev`/`build` and is
  gitignored — don't edit it by hand.

Never commit real API keys or secrets — `.env.example` files contain safe
placeholders only.

## Manual test flow

1. Open **http://localhost:5173** — you land on `/login`.
2. **Sign up** with a name, email, and a password meeting the policy shown on
   the form. You're redirected to `/onboarding`.
3. **Complete onboarding**: pick at least one asset, an investor type, at
   least one content type (try selecting only one or two — the dashboard
   only shows sections matching what you picked), and a risk level, then
   submit.
4. You're redirected to **`/dashboard`**, which shows your preference summary
   and up to four personalized sections (Market News, Coin Prices, AI Insight
   of the Day, and a Fun Crypto Meme) — each with a subtle label showing
   whether its data is live, cached, or a fallback.
5. **Vote** 👍 or 👎 on a few items across different sections — downvoting the
   AI insight replaces it immediately, and downvoting a coin removes it from
   Market Signals and your saved preferences.
6. **Refresh the page** — feedback stays persisted, and the removed coin
   stays removed (see "Feedback vs. preferences, and what's next" below).
7. **Log out**, then **log back in** — since onboarding is already complete,
   you're taken straight to `/dashboard` without seeing the form again.

## API overview

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | No | Health check |
| POST | `/auth/signup` | No | Create a user, returns a JWT |
| POST | `/auth/login` | No | Authenticate, returns a JWT |
| GET | `/auth/me` | Bearer | Current user + `onboardingCompleted` |
| GET | `/preferences/me` | Bearer | Current user's onboarding preferences |
| PUT | `/preferences/me` | Bearer | Create/update preferences, completes onboarding |
| GET | `/dashboard/today` | Bearer | The personalized daily briefing |
| POST | `/dashboard/ai-insight/refresh` | Bearer | Regenerate the AI insight, avoiding a rejected one (used after a thumbs-down) |
| POST | `/feedback` | Bearer | Record/update a thumbs up/down vote |
| GET | `/feedback/me` | Bearer | All of the current user's feedback votes |

Full request/response examples for every endpoint are in the "API examples"
section below, and interactively at `/docs` (Swagger UI) once the backend is
running.

## Feedback vs. preferences, and what's next

Cryptalks deliberately keeps two kinds of user data separate:

- **Preferences** (`user_preferences` table) — explicit choices made once
  during onboarding (assets, investor type, content types, risk level). These
  drive what content the dashboard generates.
- **Feedback** (`feedback` table) — implicit, ongoing behavioral data: a
  thumbs up/down vote per dashboard item. Submitting feedback **never**
  modifies preferences or `onboardingCompleted` — it's its own row, and the
  user never has to redo onboarding because of it.

Feedback actively shapes the dashboard for every section, each with a rule
matched to what that section actually is — deliberately simple, hand-written
logic, not a ranking or ML model:

- **Market News** — a news item the user has downvoted is excluded from
  future selection where possible. This mostly matters for the static
  fallback pool (stable IDs); live CryptoPanic articles get a new ID per
  article per day, so there's rarely a repeat to suppress there.
- **Fun Crypto Meme** — a downvoted meme is excluded from the daily pick's
  pool going forward.
- In both cases, if excluding downvoted items would leave fewer than the
  minimum useful count, previously-downvoted items are topped back up **one
  at a time, in relevance order, only until the minimum is met** — not reset
  to the full pool at once. If you downvote every reachable news item, you'll
  see the fewest of them come back that still satisfies the minimum, not all
  of them simultaneously.
- **Coin Prices** — a downvoted coin is treated as "I don't want this asset
  in my briefing at all": `POST /feedback` removes it from the user's saved
  `assets` preference (`backend/app/feedback.py`, `_maybe_remove_downvoted_asset`),
  so it stops appearing in Market Signals, Market News, and the AI insight's
  price context on every future load — not just visually hidden client-side.
  The last remaining asset is never removed, so the dashboard always has at
  least one asset to build around.
- **AI Insight of the Day** — a thumbs-down doesn't just get recorded, it
  triggers an immediate replacement: the frontend calls
  `POST /dashboard/ai-insight/refresh` with the rejected insight's text, and
  `generate_ai_insight()` is asked to produce a *different* one (a different
  angle in the live OpenRouter prompt, or a rotated phrasing/headline variant
  in the deterministic fallback — see `integrations.py`). Previously-rejected
  insight ids are also excluded on ordinary dashboard loads, so a plain
  refresh won't coincidentally regenerate the exact same rejected wording.
- Across all sections, if OpenRouter is configured, a one-line summary of the
  user's feedback history is included as context in the AI insight prompt too.

There is still no ranking model, ML training, or fine-tuning anywhere in the
codebase — every rule above is hand-written exclusion/replacement logic, not
a recommendation engine.

---

## Project structure

```
cryptalks/
├── backend/
│   ├── app/
│   │   ├── main.py         # FastAPI app, routes, CORS
│   │   ├── config.py       # Environment-based settings
│   │   ├── database.py     # SQLAlchemy engine/session
│   │   ├── models.py       # User, UserPreferences, Feedback, CachedCoinPrice
│   │   ├── schemas.py      # Pydantic request/response schemas + validation
│   │   ├── auth.py         # Password hashing, JWT creation/validation
│   │   ├── preferences.py  # Preferences router
│   │   ├── dashboard.py    # Dashboard router — composes the briefing
│   │   ├── integrations.py # CoinGecko/CryptoPanic/OpenRouter clients + fallback logic + meme catalog
│   │   └── feedback.py     # Feedback router
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.tsx               # React entry point, TanStack Router setup
│   │   ├── styles.css             # Tailwind v4 theme (oklch colors, glass/gradient utilities)
│   │   ├── lib/
│   │   │   ├── api.ts             # Backend API helper (fetch, token storage)
│   │   │   └── utils.ts           # `cn()` class-merging helper
│   │   ├── components/cryptalks/
│   │   │   ├── Logo.tsx
│   │   │   ├── SectionCard.tsx
│   │   │   └── FeedbackButtons.tsx
│   │   └── routes/                # File-based routes (TanStack Router)
│   │       ├── __root.tsx         # Root layout, not-found/error components
│   │       ├── index.tsx          # Redirects to /login or /dashboard
│   │       ├── login.tsx
│   │       ├── signup.tsx
│   │       ├── onboarding.tsx     # 4-step wizard (assets, investor type, content, risk)
│   │       └── dashboard.tsx
│   ├── public/
│   │   ├── favicon.svg     # Gradient coin icon (browser tab)
│   │   ├── favicon.ico     # Raster fallback for older browsers
│   │   └── memes/          # Static meme images served at /memes/*
│   ├── index.html
│   ├── vite.config.ts
│   ├── vercel.json         # SPA rewrite: unmatched paths -> index.html
│   ├── package.json
│   ├── .env.example
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
├── AI_USAGE_SUMMARY.md
└── README.md
```

## Password policy

Passwords must:

- Be at least 8 characters long
- Contain at least one uppercase letter, one lowercase letter, and one number
- Contain at least one special character from `! @ # $ % ^ & * _ - ?`
- Only contain English letters, numbers, and the allowed special characters above
- Not contain the user's name
- Not contain the email username (the part before `@`)

## Preferences validation

`PUT /preferences/me` accepts (JSON uses camelCase; the API also accepts snake_case):

| Field | Required | Allowed values |
|---|---|---|
| `assets` | Yes, at least one | `BTC`, `ETH`, `SOL`, `ADA`, `XRP`, `DOGE`, `AVAX`, `LINK`, `MATIC`, `DOT` |
| `investorType` | Yes | `HODLer`, `Day Trader`, `NFT Collector`, `Beginner`, `Researcher` |
| `contentTypes` | Yes, at least one | `Market News`, `Charts`, `AI Insights`, `Fun` |
| `riskLevel` | Yes | `Low`, `Medium`, `High` |

## API examples

### Sign up

```bash
curl -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ariel",
    "email": "user@example.com",
    "password": "StrongPass1!"
  }'
```

### Log in

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "StrongPass1!"
  }'
```

### Get current user

```bash
curl http://localhost:8000/auth/me \
  -H "Authorization: Bearer <access_token>"
```

### Save preferences (onboarding)

```bash
curl -X PUT http://localhost:8000/preferences/me \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "assets": ["BTC", "ETH"],
    "investorType": "HODLer",
    "contentTypes": ["Market News", "AI Insights", "Fun"],
    "riskLevel": "Medium"
  }'
```

### Get current preferences

```bash
curl http://localhost:8000/preferences/me \
  -H "Authorization: Bearer <access_token>"
```

### Get today's dashboard

```bash
curl http://localhost:8000/dashboard/today \
  -H "Authorization: Bearer <access_token>"
```

### Submit feedback

```bash
curl -X POST http://localhost:8000/feedback \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "sectionType": "AI_INSIGHT",
    "itemId": "insight-30af3087fa9f",
    "vote": "UP"
  }'
```

`itemId` values come from the corresponding item's `id` field in the
`GET /dashboard/today` response — for the AI insight specifically, that id is
a short hash of its actual text (`_insight_id()` in `integrations.py`), not a
fixed string. This matters because the insight's wording changes whenever
live price data moves: if the id were fixed (e.g. `"insight-today"`), a vote
cast on one day's wording would silently "stick" to completely different
wording later. Hashing the content means identical text reuses the same id
(so a genuinely repeated insight keeps its vote), while different text gets a
fresh id and starts unvoted.

Voting again with the same `sectionType` + `itemId` updates the existing vote
instead of creating a new row (enforced by a unique constraint on
`user_id, section_type, item_id`).

### Get your feedback history

```bash
curl http://localhost:8000/feedback/me \
  -H "Authorization: Bearer <access_token>"
```

## Integration details

### Coin prices (CoinGecko)

Coin prices are fetched from CoinGecko **through the backend only**. Only the
assets a user selected during onboarding are returned — never all 10
supported coins unless the user selected all 10.

`get_coin_prices()` in `backend/app/integrations.py` resolves each asset's
price with a strict priority, independently per asset:

1. **Live** — `https://api.coingecko.com/api/v3/simple/price`, 5-second
   timeout. On success, the price is upserted into the `cached_coin_prices`
   table and returned with `"source": "live"`, `"isFallback": false`.
2. **Cache** — if the live request fails or omits an asset, the last cached
   price from `cached_coin_prices` is used, with `"source": "cache"`,
   `"isFallback": true`.
3. **Static fallback** — if there's no cached price either, a small static
   dictionary supplies a reference price, with `"source": "static"`,
   `"isFallback": true`.

CoinGecko errors are logged as a backend warning and never raised —
`GET /dashboard/today` always returns `200`. `COINGECKO_API_KEY` is optional
(sent as the `x-cg-demo-api-key` header when set).

### Market news (CryptoPanic)

Market news is fetched **through the backend only**.

`get_market_news()` follows this order:

1. **No API key** — `CRYPTOPANIC_API_KEY` unset → the external call is
   skipped and static fallback news is used. This is the default.
2. **Live** — if a key is configured, the backend calls CryptoPanic's
   `/api/v1/posts/` (5-second timeout), filtered to the user's selected assets.
   Results are normalized with `"source": "Crypto News"`, `"isFallback": false`,
   and the real article `url`. The `summary` field is a generic,
   backend-written sentence (CryptoPanic's free tier has no article bodies) —
   the UI is never presented as officially affiliated with CryptoPanic.
3. **Fallback on failure or thin results** — a failed request or fewer than 2
   usable items silently falls back to static news rather than a
   partial/broken list.
4. **Static fallback** — a fixed list covering BTC, ETH, SOL, general market
   movement, regulatory/risk-awareness, and market sentiment. Items related to
   the user's selected assets are shown first, padded to 2–4 items total, with
   `"source": "Static Fallback"`, `"isFallback": true`, `"url": null`.

All news wording (backend-written summaries and static fallback copy)
avoids directive language ("buy", "sell", "will pump", "guaranteed profit") in
favor of neutral framing ("market context", "may be relevant", "not a trading
recommendation"). Real article headlines from CryptoPanic are shown as-is in
`title`, since that's the actual news, not Cryptalks-authored copy.

### AI Insight of the Day (OpenRouter)

The AI insight is generated **through the backend only**.

`generate_ai_insight()` follows this order:

1. **No API key or model** — if `OPENROUTER_API_KEY` or `OPENROUTER_MODEL` is
   missing, the external call is skipped and a deterministic fallback insight
   is used. This is the default, and a missing model name never crashes the app.
2. **Live** — if both are configured, the backend calls OpenRouter's
   `/chat/completions` (Bearer auth, 10-second timeout) with a structured
   prompt built from the user's investor type, selected assets, content
   preferences, risk level, current coin price data (including whether each
   price is live/cached/static), the top 2–4 market news items, and a
   one-line summary of the user's feedback history. The system prompt
   forbids financial advice, trading directives, and price predictions, and
   asks for a short, natural-sounding briefing — explicitly *not* a recap of
   the user's own preferences ("because you selected...") and *not* a
   disclaimer sentence, since the dashboard already shows one separately.
3. **Safety check** — the raw model output is scanned for a fixed list of
   unsafe phrases (`"buy now"`, `"you should buy/sell/invest"`,
   `"guaranteed profit"`, `"will pump"`, `"will definitely rise/go up"`,
   `"trade now"`, `"enter/exit a position"`, and an affirmative `"is financial
   advice"` claim — deliberately distinct from a safe negated statement). This
   is intentionally simple substring matching, not a moderation model — any
   match discards the response in favor of the deterministic fallback.
4. **Fallback on any failure** — a missing key/model, a failed/timed-out
   request, empty content, or unsafe content all silently fall back to a
   deterministic insight: a short, templated note that leads with the biggest
   coin move, references a relevant news headline, and closes with a phrase
   tailored to the user's investor type and risk level. Failures are logged
   as a backend warning, never raised — `GET /dashboard/today` always returns
   `200`.

The response includes `"source"` (`"openrouter"` or `"deterministic"`) and
`"isFallback"`, shown in the UI as a subtle "AI-generated insight" vs.
"Fallback insight" label. Pick any model from
[openrouter.ai/models](https://openrouter.ai/models), including free-tier
models — nothing here requires or hardcodes a paid model.

### Dynamic meme

The meme is chosen from a static catalog of 7 crypto-themed memes (title,
caption, and image). Images are served as static files from
`frontend/public/memes/` — no external meme API, no database table, and
nothing fetched at runtime. Selection is deterministic per user per day:

```python
digest = hashlib.sha256(f"{user_id}-{today_date}".encode()).hexdigest()
index = int(digest, 16) % len(MEME_CATALOG)
```

This uses a cryptographic hash rather than Python's built-in `hash()`, which
is randomized per process — a stable hash means the same user sees the same
meme all day, even across backend restarts, without needing to persist
anything. If the meme image fails to load in the browser, the title still
renders and the layout stays intact. Clicking a meme opens it full-size in a
lightbox (closes on click-outside, the X button, or Escape).

> **Note on image sourcing:** the 7 catalog images are well-known,
> widely-circulated crypto/internet memes, not originally-created artwork —
> typical for casual/portfolio use, but worth knowing if this is ever used
> somewhere that requires cleared image rights.

## Testing individual integrations

Each of the three external integrations can be tested in isolation:

**CoinGecko:** complete onboarding with BTC + ETH, confirm the Coin Prices
rows show "Live data" and a row appears in `cached_coin_prices`
(`docker exec -it cryptalks-db-1 psql -U cryptalks -d cryptalks -c "SELECT * FROM cached_coin_prices;"`).
Break connectivity (e.g. point `COINGECKO_URL` at an unreachable host and
rebuild) and confirm rows fall back to "Cached data", then "Fallback data" for
any asset never cached — the dashboard keeps loading (`200`) throughout.

**CryptoPanic:** with no `CRYPTOPANIC_API_KEY` set (no root `.env`, or the
line left blank), Market News shows "Fallback" items. Add a real key to a
root-level `.env` file (see "Environment variables" above) and rebuild
(`docker compose up --build backend`) to see "Live" news with real article
links. Set an invalid key to confirm the request fails cleanly and news falls
back to static content.

**OpenRouter:** with no `OPENROUTER_API_KEY`/`OPENROUTER_MODEL` in `.env`, AI
Insight of the Day shows "Fallback". Add both to the root `.env` file and
rebuild to see "Live AI". Set an invalid key/model to confirm the request
fails cleanly and the insight falls back to the deterministic template — in
every case `GET /dashboard/today` still returns `200`.
