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

Later modules (the full dashboard, feedback, external market data) are not part of
this phase.

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
│   │   └── preferences.py # Preferences router (GET/PUT /preferences/me)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.tsx              # React entry point, router setup
│   │   ├── App.tsx               # Route definitions
│   │   ├── api.ts                # Backend API helper (fetch, token storage)
│   │   ├── styles.css            # Global styles
│   │   ├── components/
│   │   │   └── ProtectedRoute.tsx
│   │   └── pages/
│   │       ├── LoginPage.tsx
│   │       ├── SignupPage.tsx
│   │       ├── OnboardingPage.tsx  # Real preferences form, wired to the backend
│   │       └── DashboardPage.tsx   # Placeholder; shows saved preference summary
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
`ACCESS_TOKEN_EXPIRE_MINUTES`, `VITE_API_URL`), so `docker compose up --build` works
out of the box. For running either service outside Docker:

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

`GET /auth/me` reports `onboardingCompleted: true` once the user has saved
preferences via `PUT /preferences/me`.

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

## Example end-to-end flow (API)

1. **Signup** – `POST /auth/signup` with name, email, password → returns an access token.
2. **Login** – `POST /auth/login` with email, password → returns an access token.
3. **Use the token** – pass it as `Authorization: Bearer <access_token>` on subsequent requests.
4. **Save preferences** – `PUT /preferences/me` with assets, investor type, content types, and risk level.
5. **Confirm onboarding** – `GET /auth/me` now returns `"onboardingCompleted": true`.

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

`/dashboard` calls `GET /preferences/me` and renders a short summary (assets,
investor type, content types, risk level) above the disclaimer.

### Manual test flow

1. Open **http://localhost:5173** — you land on `/login`.
2. Go to **Sign up**, create an account. On success you're redirected to `/onboarding`.
3. Fill out the onboarding form (pick at least one asset, an investor type, at least
   one content type, and a risk level) and submit.
4. On success you're redirected to `/dashboard`, which now shows a summary of the
   preferences you just saved, plus the disclaimer.
5. Click **Log out** — you're sent back to `/login` and the token is cleared from
   `localStorage`.
6. **Log in** again with the same credentials — since onboarding is now genuinely
   complete (`GET /auth/me` returns `onboardingCompleted: true`), you're redirected
   straight to `/dashboard` without seeing the form again. Manually visiting
   `/onboarding` at this point redirects back to `/dashboard`.

Backend error handling can also be checked from the UI: logging in with a wrong
password shows a clean "Invalid email or password" message, signing up with a weak
password (e.g. `weak`) surfaces the backend's password policy error inline, and
submitting the onboarding form with a section left empty shows a clear validation
message without calling the backend.
