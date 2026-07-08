# Cryptalks

Cryptalks is an AI-powered, personalized daily crypto briefing dashboard. It surfaces
market context and news tailored to each user's stated interests. **It is not a trading
prediction app and does not provide financial advice.**

This repository currently implements **Phase 1** (backend foundation: PostgreSQL
connectivity, JWT-based authentication, password hashing, password policy validation,
and a protected "current user" endpoint) and **Phase 2** (onboarding preferences:
storing each user's asset/content preferences and exposing onboarding status). The
frontend and later modules (dashboard, feedback, external market data) are not part
of this phase.

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
├── docker-compose.yml
├── .env.example
└── README.md
```

## Running the backend with Docker Compose

Requirements: Docker and Docker Compose.

```bash
docker compose up --build
```

This starts:

- **db** – a PostgreSQL 16 database
- **backend** – the FastAPI app, served with uvicorn on http://localhost:8000

Tables are created automatically on startup. The API docs (Swagger UI) are available at:

http://localhost:8000/docs

The `backend` service in `docker-compose.yml` ships with working development defaults
for `DATABASE_URL`, `JWT_SECRET_KEY`, `JWT_ALGORITHM`, and `ACCESS_TOKEN_EXPIRE_MINUTES`,
so `docker compose up --build` works out of the box. For running the backend outside
Docker (e.g. locally with `uvicorn` against your own Postgres instance), copy
`.env.example` to `backend/.env` and adjust the values — never commit real secrets.

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

## Example end-to-end flow

1. **Signup** – `POST /auth/signup` with name, email, password → returns an access token.
2. **Login** – `POST /auth/login` with email, password → returns an access token.
3. **Use the token** – pass it as `Authorization: Bearer <access_token>` on subsequent requests.
4. **Save preferences** – `PUT /preferences/me` with assets, investor type, content types, and risk level.
5. **Confirm onboarding** – `GET /auth/me` now returns `"onboardingCompleted": true`.
