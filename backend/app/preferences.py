from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User, UserPreferences
from app.schemas import PreferenceCreateOrUpdate, PreferenceResponse

router = APIRouter(prefix="/preferences", tags=["preferences"])


def get_onboarding_completed(db: Session, user_id: int) -> bool:
    preferences = db.query(UserPreferences).filter(UserPreferences.user_id == user_id).first()
    return bool(preferences and preferences.onboarding_completed)


def _to_response(preferences: UserPreferences) -> PreferenceResponse:
    return PreferenceResponse(
        assets=preferences.assets,
        investor_type=preferences.investor_type,
        content_types=preferences.content_types,
        risk_level=preferences.risk_level,
        onboarding_completed=preferences.onboarding_completed,
    )


@router.get("/me", response_model=PreferenceResponse)
def get_my_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    preferences = db.query(UserPreferences).filter(UserPreferences.user_id == current_user.id).first()
    if preferences is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Preferences not found")
    return _to_response(preferences)


@router.put("/me", response_model=PreferenceResponse)
def save_my_preferences(
    payload: PreferenceCreateOrUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    preferences = db.query(UserPreferences).filter(UserPreferences.user_id == current_user.id).first()
    if preferences is None:
        preferences = UserPreferences(user_id=current_user.id)
        db.add(preferences)

    preferences.assets = payload.assets
    preferences.investor_type = payload.investor_type
    preferences.content_types = payload.content_types
    preferences.risk_level = payload.risk_level
    preferences.onboarding_completed = True

    db.commit()
    db.refresh(preferences)

    return _to_response(preferences)
