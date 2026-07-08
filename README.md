# Cryptalks

Cryptalks is an AI-powered, personalized daily crypto briefing dashboard. It surfaces
market context and news tailored to each user's stated interests. **It is not a trading
prediction app and does not provide financial advice.**

This repository currently implements:

- **Phase 1** – backend foundation: PostgreSQL connectivity, JWT-based authentication,
  password hashing, password policy validation, and a protected "current user" endpoint.
- **Phase 2** – onboarding preferences: storing each user's asset/content preferences
  and exposing onboarding status.
- **Phase 3** – React frontend foundation: signup/login pages, protected routing,
  token handling, and placeholder onboarding/dashboard pages.
- **Phase 4** – real onboarding form: a preferences form wired to the backend, with a
  dashboard that summarizes the saved preferences.
- **Phase 5** – dashboard shell: a personalized daily briefing built from backend
  mock/static data (market news, coin prices, an AI insight, and a meme).
- **Phase 6** – feedback storage: thumbs up/down voting on dashboard content, stored
  in PostgreSQL per user, separate from onboarding preferences.
- **Phase 7** – real coin prices: `GET /dashboard/today` now fetches live prices
  from CoinGecko through the backend, with a PostgreSQL cache and a static
  fallback so the dashboard never breaks if CoinGecko is unavailable.

Later modules (real news feeds via CryptoPanic, a real AI model via OpenRouter,
and using feedback to actually tune recommendations) are not part of this phase.

## Project structure

```
cryptalks/
├── backend/
│   ├── app/
│   │   ├── main.py        # FastAPI app, routes, CORS
│   │   ├── config.py      # Environment-based settings
│   │   ├── database.py    # SQLAlchemy engine/session
│   │   ├── models.py      # User and UserPreferences models
│   │   ├── schemas.py     # Pydantic request/response schemas + validation
│   │   ├── auth.py        # Password hashing, JWT creation/validation
│   │   ├── preferences.py # Preferences router (GET/PUT /preferences/me)
│   │   ├── dashboard.py   # Dashboard router (GET /dashboard/today)
│   │   ├── integrations.py # CoinGecko client + cache/fallback + mock news/insight/meme
│   │   └── feedback.py    # Feedback router (POST /feedback, GET /feedback/me)
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
│   │       ├── OnboardingPage.tsx  # Real preferences form, wired to the backend
│   │       └── DashboardPage.tsx   # Personalized briefing (news, prices, AI insight, meme)
│   ├── package.json
│   ├── .env.example
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## Running the full app with Docker Compose

Requirements: Docker and Docker Compose.

```bash
docker compose up --build
```

This starts:

- **db** – a PostgreSQL 16 database
- **backend** – the FastAPI app, served with uvicorn at **http://localhost:8000**
  (Swagger docs at **http://localhost:8000/docs**)
- **frontend** – the React/Vite app, served at **http://localhost:5173**

Tables are created automatically on backend startup.

Both `backend` and `frontend` services in `docker-compose.yml` ship with working
development defaults (`DATABASE_URL`, `JWT_SECRET_KEY`, `JWT_ALGORITHM`,
`ACCESS_TOKEN_EXPIRE_MINUTES`, `COINGECKO_API_KEY`, `VITE_API_URL`), so
`docker compose up --build` works out of the box — `COINGECKO_API_KEY` is optional
and empty by default; the backend calls CoinGecko's free public endpoint without it.
For running either service outside Docker:

- Backend: copy `.env.example` to `backend/.env` and adjust the values, then run
  `uvicorn app.main:app --reload` from `backend/` against your own Postgres instance.
- Frontend: copy `frontend/.env.example` to `frontend/.env`, then run `npm install`
  and `npm run dev` from `frontend/`.

Never commit real secrets.

## Endpoints available in this phase

| Method | Path             | Auth required | Description                              |
|--------|------------------|----------------|-------------------------------------------|
| GET    | `/`              | No             | Health check                              |
| POST   | `/auth/signup`   | No             | Create a new user, returns JWT            |
| POST   | `/auth/login`    | No             | Authenticate, returns JWT                 |
| GET    | `/auth/me`       | Yes (Bearer)   | Returns the current authenticated user    |
| GET    | `/preferences/me`| Yes (Bearer)   | Returns the current user's preferences    |
| PUT    | `/preferences/me`| Yes (Bearer)   | Creates or updates preferences, completes onboarding |
| GET    | `/dashboard/today`| Yes (Bearer)  | Returns the personalized daily briefing (mock data) |
| POST   | `/feedback`      | Yes (Bearer)   | Records/updates a thumbs up/down vote on a dashboard item |
| GET    | `/feedback/me`   | Yes (Bearer)   | Returns all of the current user's feedback votes |

`GET /auth/me` reports `onboardingCompleted: true` once the user has saved
preferences via `PUT /preferences/me`. `GET /dashboard/today` returns
`403 Forbidden` with `"Complete onboarding before viewing the dashboard"` if the
user hasn't saved preferences yet.

### Password policy

Passwords must:

- Be at least 8 characters long
- Contain at least one uppercase letter, one lowercase letter, and one number
- Contain at least one special character from `! @ # $ % ^ & * _ - ?`
- Only contain English letters, numbers, and the allowed special characters above
- Not contain the user's name
- Not contain the email username (the part before `@`)

### Preferences validation

`PUT /preferences/me` accepts (JSON uses camelCase; the API also accepts snake_case):

| Field           | Required | Allowed values                                                        |
|-----------------|----------|-------------------------------------------------------------------------|
| `assets`        | Yes, at least one | `BTC`, `ETH`, `SOL`, `ADA`, `XRP`, `DOGE`, `AVAX`, `LINK`, `MATIC`, `DOT` |
| `investorType`  | Yes      | `HODLer`, `Day Trader`, `NFT Collector`, `Beginner`, `Researcher`       |
| `contentTypes`  | Yes, at least one | `Market News`, `Charts`, `AI Insights`, `Fun`                  |
| `riskLevel`     | Yes      | `Low`, `Medium`, `High`                                                 |

## Example requests

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

## Example end-to-end flow (API)

1. **Signup** – `POST /auth/signup` with name, email, password → returns an access token.
2. **Login** – `POST /auth/login` with email, password → returns an access token.
3. **Use the token** – pass it as `Authorization: Bearer <access_token>` on subsequent requests.
4. **Save preferences** – `PUT /preferences/me` with assets, investor type, content types, and risk level.
5. **Confirm onboarding** – `GET /auth/me` now returns `"onboardingCompleted": true`.
6. **Load the dashboard** – `GET /dashboard/today` now returns a personalized briefing
   instead of a 403.

## Dashboard data sources

`GET /dashboard/today` personalizes its response using the user's saved
preferences. As of this phase, coin prices are real; everything else is still
mock/static data (see the roadmap above for what's next):

- **Coin prices** — real, live prices from CoinGecko for only the assets the user
  selected during onboarding (see "Coin prices (CoinGecko)" below for the full
  fetch/cache/fallback behavior).
- **Market news** — mock news items related to the user's selected assets (BTC,
  ETH, and SOL each have a dedicated mock item) are shown first, padded out with
  general market news to a total of 2–4 items.
- **AI insight** — a deterministic, template-generated paragraph built from the
  user's investor type, selected assets, preferred content types, and risk level,
  plus one or two observations about the coin price data (live or fallback —
  the wording adapts to say "live" vs. "reference" dataset accordingly). Wording is
  intentionally careful (e.g. "this may be useful context") and explicitly states
  that Cryptalks does not give financial advice — it never tells the user to buy,
  sell, or expect a specific market outcome. No LLM is called for this phase; the
  insight is generated by a template function in the backend.
- **Meme** — one of a small fixed set of placeholder memes, chosen deterministically
  per user.

## Coin prices (CoinGecko)

Coin prices are fetched from CoinGecko **through the backend only** — the frontend
never calls CoinGecko or any other external API directly; it only ever calls
`GET /dashboard/today` on the FastAPI backend.

`get_coin_prices()` in `backend/app/integrations.py` resolves a price for each of
the user's selected assets using this priority order, per asset:

1. **Live** — fetch `https://api.coingecko.com/api/v3/simple/price` for the
   selected assets (mapped to CoinGecko's own IDs, e.g. `BTC` → `bitcoin`), with a
   5-second timeout. On success, each price is saved into the `cached_coin_prices`
   table (one row per symbol, upserted) and returned with `"source": "live"`,
   `"isFallback": false`.
2. **Cache** — if the CoinGecko request fails (timeout, network error, non-2xx
   response) or omits an asset, the backend falls back to the most recent price
   stored in `cached_coin_prices` for that asset, returned with
   `"source": "cache"`, `"isFallback": true`.
3. **Static fallback** — if there's no cached price either (e.g. first run, before
   CoinGecko has ever succeeded), a small static dictionary in `integrations.py`
   supplies a reference price, returned with `"source": "static"`,
   `"isFallback": true`.

This resolution happens independently per asset, so a partial CoinGecko response
(or a still-empty cache for one asset) doesn't affect the others. CoinGecko errors
are logged as a backend warning and never raised to the caller — `GET /dashboard/today`
always returns `200` with a full dashboard, never fails because of CoinGecko.
Only the assets the user actually selected are returned — the endpoint never
returns all 10 supported coins unless the user selected all 10.

An optional `COINGECKO_API_KEY` environment variable is supported (sent as the
`x-cg-demo-api-key` header when set); the app works without one using CoinGecko's
free public endpoint.

## Feedback vs. preferences

Cryptalks tracks two distinct kinds of user data, and this phase keeps them
strictly separate:

- **Preferences** (`user_preferences` table) — explicit choices made once during
  onboarding: selected assets, investor type, content types, risk level. These
  drive what content is generated for the dashboard.
- **Feedback** (`feedback` table) — implicit, ongoing behavioral data: a thumbs
  up/down vote per dashboard item, tied to `user_id` + `section_type` + `item_id`.
  Submitting feedback **never** modifies `user_preferences` or `onboardingCompleted`
  — it's stored as its own row, independent of the onboarding flow.

This phase does not implement any ranking or ML logic — feedback is stored, not
acted on. The intent for future phases is that this data could inform
personalization without requiring the user to redo onboarding, e.g.:

- Sections or items a user consistently upvotes could be prioritized or shown more
  prominently.
- Content types a user consistently downvotes could be shown less often.
- Over time, accumulated votes could train or tune a simple ranking model — this
  phase only lays the storage groundwork for that, with no training involved yet.

## Frontend

The frontend is a plain React + TypeScript + Vite app (React Router for routing, no
Redux, no UI library). It only talks to the FastAPI backend — it never calls
CoinGecko, CryptoPanic, OpenRouter, or any other external API directly.

### Routes

| Route          | Access                                                         |
|----------------|------------------------------------------------------------------|
| `/signup`      | Public                                                            |
| `/login`       | Public                                                            |
| `/onboarding`  | Requires login. Redirects to `/dashboard` if onboarding is already complete. |
| `/dashboard`   | Requires login **and** completed onboarding. Otherwise redirects to `/onboarding`. |

The access token is stored in `localStorage`. `ProtectedRoute` validates it against
`GET /auth/me` on each protected navigation and redirects to `/login` if it's missing
or invalid.

### Onboarding form

`/onboarding` is a real form wired to the backend, not a placeholder:

- **Which crypto assets are you interested in?** — checkboxes (`BTC`, `ETH`, `SOL`,
  `ADA`, `XRP`, `DOGE`, `AVAX`, `LINK`, `MATIC`, `DOT`)
- **What type of investor are you?** — radio buttons (`HODLer`, `Day Trader`,
  `NFT Collector`, `Beginner`, `Researcher`)
- **What kind of content would you like to see?** — checkboxes (`Market News`,
  `Charts`, `AI Insights`, `Fun`)
- **What is your risk level?** — radio buttons (`Low`, `Medium`, `High`)

On mount it calls `GET /preferences/me` to pre-fill the form if preferences already
exist (a plain 404 just means an empty form — no error is shown for that case). On
submit it validates that every section has a selection, then calls
`PUT /preferences/me`; the button shows a saving state and is disabled while the
request is in flight. A successful save redirects to `/dashboard`; a backend
validation error is shown inline instead. Preferences are never faked client-side —
the backend is always the source of truth for `onboardingCompleted`.

### Dashboard

`/dashboard` loads `GET /preferences/me` (for the preference summary) and
`GET /dashboard/today` (for the briefing) in parallel, and renders:

1. A header — "Cryptalks", "Your personalized daily crypto briefing", and a
   **Log out** button.
2. A preference summary (assets, investor type, content types, risk level).
3. The disclaimer.
4. Four sections in a responsive grid: **Market News** (cards with title, summary,
   source, related assets), **Coin Prices** (a table with symbol, name, price, 24h
   change colored green/red, and a small subtle label — "Live data", "Cached data",
   or "Fallback data" — reflecting the backend's `source` field for that row),
   **AI Insight of the Day** (a highlighted card), and **Fun Crypto Meme** (title +
   image).

If `GET /dashboard/today` responds `403` (onboarding not complete), the page
redirects to `/onboarding` instead of showing an error — this is a defensive
fallback, since `ProtectedRoute` already blocks `/dashboard` until onboarding is
complete.

### Feedback (thumbs up/down)

Every dashboard item — each market news card, each coin price row, the AI
insight, and the meme — has 👍/👎 buttons from the reusable `FeedbackButtons`
component. On dashboard load, `GET /feedback/me` is fetched alongside the
briefing and preferences, and used to pre-select any vote the user already
cast. Clicking a button calls `POST /feedback` for just that item (a per-item
`submitting` flag disables just that pair of buttons, not the whole page), and
on success the selected button updates immediately; switching from 👍 to 👎 (or
back) simply re-submits with the new vote, which the backend upserts in place.
A failed request shows a clean inline error without losing the rest of the
dashboard. A short note under the disclaimer explains: "Your feedback helps
Cryptalks learn which content is useful to you. It does not directly change
your saved onboarding preferences."

### Manual test flow

1. Open **http://localhost:5173** — you land on `/login`.
2. Go to **Sign up**, create an account. On success you're redirected to `/onboarding`.
3. Fill out the onboarding form (pick at least one asset, an investor type, at least
   one content type, and a risk level) and submit.
4. On success you're redirected to `/dashboard`, which now shows your preference
   summary, the disclaimer, and all four personalized briefing sections built from
   the assets and investor type you selected.
5. Click **Log out** — you're sent back to `/login` and the token is cleared from
   `localStorage`.
6. **Log in** again with the same credentials — since onboarding is now genuinely
   complete (`GET /auth/me` returns `onboardingCompleted: true`), you're redirected
   straight to `/dashboard` without seeing the form again. Manually visiting
   `/onboarding` at this point redirects back to `/dashboard`.
7. **Vote** 👍 or 👎 on a market news item, a coin price row, the AI insight, and
   the meme.
8. **Refresh the page** (`F5`) — the same buttons you clicked are still highlighted,
   confirming the vote was persisted and reloaded via `GET /feedback/me`.
9. **Confirm in PostgreSQL** (optional): `docker exec -it cryptalks-db-1 psql -U cryptalks -d cryptalks -c "SELECT * FROM feedback;"`
   should show one row per item you voted on, tied to your `user_id`.

Backend error handling can also be checked from the UI: logging in with a wrong
password shows a clean "Invalid email or password" message, signing up with a weak
password (e.g. `weak`) surfaces the backend's password policy error inline, and
submitting the onboarding form with a section left empty shows a clear validation
message without calling the backend.

### Testing CoinGecko + cache + fallback behavior

1. Start the app with `docker compose up --build`.
2. Sign up, log in, and complete onboarding selecting only **BTC** and **ETH**.
3. Open the dashboard and confirm the **Coin Prices** section shows exactly those
   two assets (not all 10 supported coins).
4. With normal network access, the price rows should show **"Live data"** — these
   are real CoinGecko prices, and a row now exists per asset in the
   `cached_coin_prices` table:
   `docker exec -it cryptalks-db-1 psql -U cryptalks -d cryptalks -c "SELECT * FROM cached_coin_prices;"`
5. To see the fallback path, simulate a CoinGecko failure — e.g. temporarily block
   outbound access from the backend container, or edit `COINGECKO_URL` in
   `backend/app/integrations.py` to an unreachable host and rebuild
   (`docker compose up --build backend`). Reload the dashboard:
   - If step 4 already ran successfully, the rows now show **"Cached data"** (from
     `cached_coin_prices`), and the dashboard still loads normally.
   - If no price was ever cached for an asset, that row instead shows
     **"Fallback data"** (the static dictionary in `integrations.py`).
6. In both failure cases, `GET /dashboard/today` still returns `200` with a
   complete dashboard — it never errors out just because CoinGecko is unreachable.
