# Cryptalks

Cryptalks is an AI-powered, personalized crypto briefing dashboard. It combines
onboarding preferences, live crypto prices, market news, an AI-generated daily
insight, a light meme, and thumbs up/down feedback voting into one daily
briefing per user.

> **Product positioning:** Cryptalks provides educational market context only.
> It is **not** a trading prediction app. It does not provide financial advice,
> trading signals, or buy/sell recommendations — anywhere in the product,
> including AI-generated content.

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
  deterministic fallback insight and a keyword-based safety filter that
  discards any unsafe/financial-advice-flavored output
- A dynamic daily meme, chosen deterministically per user per day from a
  static catalog (no external API, no database table)
- Thumbs up/down feedback on every dashboard item, persisted in PostgreSQL and
  restored on refresh
- Fully Dockerized: `docker compose up --build` runs the whole stack

## Tech stack

**Frontend:** React, TypeScript, Vite, React Router (no Redux, no UI library)

**Backend:** FastAPI, SQLAlchemy, PostgreSQL, JWT (`python-jose`), `bcrypt`
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

The frontend only ever calls the FastAPI backend — it never calls CoinGecko,
CryptoPanic, or OpenRouter directly, and never receives or uses any
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

## Local setup

Requirements: Docker and Docker Compose.

```bash
docker compose up --build
```

This starts three services, with working development defaults already in
`docker-compose.yml` (no `.env` file required to get started):

- **db** — PostgreSQL 16
- **backend** — FastAPI on **http://localhost:8000** (Swagger UI at
  **http://localhost:8000/docs**)
- **frontend** — the React/Vite app on **http://localhost:5173**

Tables are created automatically on backend startup.

To run a service outside Docker:

- **Backend:** copy `.env.example` to `backend/.env`, adjust values, then run
  `uvicorn app.main:app --reload` from `backend/` against your own Postgres
  instance.
- **Frontend:** copy `frontend/.env.example` to `frontend/.env`, then run
  `npm install` and `npm run dev` from `frontend/`.

Never commit real API keys or secrets — `.env.example` files contain safe
placeholders only.

## Manual test flow

1. Open **http://localhost:5173** — you land on `/login`.
2. **Sign up** with a name, email, and a password meeting the policy shown on
   the form. You're redirected to `/onboarding`.
3. **Complete onboarding**: pick at least one asset, an investor type, at
   least one content type, and a risk level, then submit.
4. You're redirected to **`/dashboard`**, which shows your preference summary
   and four personalized sections: Market News, Coin Prices, AI Insight of the
   Day, and a Fun Crypto Meme — each with a subtle label showing whether its
   data is live, cached, or a fallback.
5. **Vote** 👍 or 👎 on a few items across different sections.
6. **Refresh the page** — the same buttons stay highlighted, confirming your
   feedback was persisted and reloaded from the backend.
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

Feedback does inform two parts of the dashboard, with a deliberately simple
rule rather than any ranking or ML model:

- **Market News** — a news item the user has downvoted is excluded from
  future selection where possible. This mostly matters for the static
  fallback pool (stable IDs); live CryptoPanic articles get a new ID per
  article per day, so there's rarely a repeat to suppress there.
- **Fun Crypto Meme** — a downvoted meme is excluded from the daily pick's
  pool going forward.
- In both cases, if excluding downvoted items would leave too few (or zero)
  to choose from, the filter is dropped for that request rather than showing
  an empty or near-empty section — showing something is preferred over
  showing nothing.
- If OpenRouter is configured, a one-line summary of the user's feedback
  history is also included as context in the AI insight prompt, though the
  model may or may not act on it.

Coin prices are not filtered by feedback — a downvoted price row would just
mean the user doesn't want to see that asset, which is really an onboarding
preference change, not a feedback-driven exclusion.

There is still no ranking model, ML training, or fine-tuning anywhere in the
codebase — this is a hand-written exclusion rule, not a recommendation engine.
Future phases could build on it, e.g. weighting which content types or assets
get emphasis, or eventually training/evaluating a lightweight ranking model.

## AI safety note

Cryptalks uses AI only to summarize market context for the daily briefing. It
does not provide financial advice and does not recommend buying, selling, or
holding any asset. The system prompt sent to OpenRouter explicitly forbids
trading directives and price predictions, and every AI response is passed
through a simple keyword safety filter before being shown to the user — if
anything looks unsafe, a deterministic fallback insight is used instead (see
"AI Insight of the Day (OpenRouter)" below for the exact mechanics).

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
│   │   ├── main.tsx              # React entry point, router setup
│   │   ├── App.tsx               # Route definitions
│   │   ├── api.ts                # Backend API helper (fetch, token storage)
│   │   ├── styles.css            # Global styles
│   │   ├── components/
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── DashboardCard.tsx
│   │   │   └── FeedbackButtons.tsx
│   │   └── pages/
│   │       ├── LoginPage.tsx
│   │       ├── SignupPage.tsx
│   │       ├── OnboardingPage.tsx
│   │       └── DashboardPage.tsx
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
    "itemId": "insight-today",
    "vote": "UP"
  }'
```

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
caption, image, all original/placeholder — no copyrighted characters or
branded content). There's no meme API and no database table for memes.
Selection is deterministic per user per day:

```python
digest = hashlib.sha256(f"{user_id}-{today_date}".encode()).hexdigest()
index = int(digest, 16) % len(MEME_CATALOG)
```

This uses a cryptographic hash rather than Python's built-in `hash()`, which
is randomized per process — a stable hash means the same user sees the same
meme all day, even across backend restarts, without needing to persist
anything. If the meme image fails to load in the browser, the title and
caption still render and the layout stays intact.

## Testing individual integrations

Each of the three external integrations can be tested in isolation:

**CoinGecko:** complete onboarding with BTC + ETH, confirm the Coin Prices
rows show "Live data" and a row appears in `cached_coin_prices`
(`docker exec -it cryptalks-db-1 psql -U cryptalks -d cryptalks -c "SELECT * FROM cached_coin_prices;"`).
Break connectivity (e.g. point `COINGECKO_URL` at an unreachable host and
rebuild) and confirm rows fall back to "Cached data", then "Fallback data" for
any asset never cached — the dashboard keeps loading (`200`) throughout.

**CryptoPanic:** with no `CRYPTOPANIC_API_KEY`, Market News shows "Fallback
news" items. Add a real key to `docker-compose.yml` and rebuild
(`docker compose up --build backend`) to see "Live news" with real article
links. Set an invalid key to confirm the request fails cleanly and news falls
back to static content.

**OpenRouter:** with no `OPENROUTER_API_KEY`/`OPENROUTER_MODEL`, AI Insight of
the Day shows "Fallback insight". Add both to `docker-compose.yml` and rebuild
to see "AI-generated insight". Set an invalid key/model to confirm the request
fails cleanly and the insight falls back to the deterministic template — in
every case `GET /dashboard/today` still returns `200`.
