from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app import models
from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.dashboard import router as dashboard_router
from app.database import Base, engine, get_db
from app.preferences import get_onboarding_completed, router as preferences_router
from app.schemas import LoginRequest, SignupRequest, TokenResponse, UserResponse

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Cryptalks API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(preferences_router)
app.include_router(dashboard_router)


@app.get("/")
def root():
    return {"message": "Cryptalks API is running"}


@app.post("/auth/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is already registered")

    user = models.User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(id=user.id, name=user.name, email=user.email, onboardingCompleted=False),
    )


@app.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    access_token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            onboardingCompleted=get_onboarding_completed(db, user.id),
        ),
    )


@app.get("/auth/me", response_model=UserResponse)
def get_me(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        onboardingCompleted=get_onboarding_completed(db, current_user.id),
    )
