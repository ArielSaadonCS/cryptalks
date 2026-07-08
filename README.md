# Cryptalks

Cryptalks is an AI-powered, personalized daily crypto briefing dashboard. It surfaces
market context and news tailored to each user's stated interests. **It is not a trading
prediction app and does not provide financial advice.**

This repository currently implements **Phase 1**: the backend foundation, including
PostgreSQL connectivity, JWT-based authentication, password hashing, password policy
validation, and a protected "current user" endpoint. The frontend and later modules
(preferences, dashboard, feedback, external market data) are not part of this phase.

## Project structure

```
cryptalks/
├── backend/
│   ├── app/
│   │   ├── main.py      # FastAPI app, routes, CORS
│   │   ├── config.py    # Environment-based settings
│   │   ├── database.py  # SQLAlchemy engine/session
│   │   ├── models.py    # User model
│   │   ├── schemas.py   # Pydantic request/response schemas + password policy
│   │   └── auth.py      # Password hashing, JWT creation/validation
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

| Method | Path          | Auth required | Description                          |
|--------|---------------|----------------|--------------------------------------|
| GET    | `/`           | No             | Health check                         |
| POST   | `/auth/signup`| No             | Create a new user, returns JWT       |
| POST   | `/auth/login` | No             | Authenticate, returns JWT            |
| GET    | `/auth/me`    | Yes (Bearer)   | Returns the current authenticated user |

### Password policy

Passwords must:

- Be at least 8 characters long
- Contain at least one uppercase letter, one lowercase letter, and one number
- Contain at least one special character from `! @ # $ % ^ & * _ - ?`
- Only contain English letters, numbers, and the allowed special characters above
- Not contain the user's name
- Not contain the email username (the part before `@`)

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
