"""Thumbs up/down voting: upserts a vote per (user, section, item), and
for a downvoted coin price, removes that asset from the user's
preferences.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Feedback, User, UserPreferences
from app.schemas import FeedbackCreate, FeedbackResponse

router = APIRouter(prefix="/feedback", tags=["feedback"])


def _to_response(feedback: Feedback) -> FeedbackResponse:
    return FeedbackResponse(
        id=feedback.id,
        section_type=feedback.section_type,
        item_id=feedback.item_id,
        vote=feedback.vote,
        created_at=feedback.created_at,
    )


def _maybe_remove_downvoted_asset(db: Session, current_user: User, payload: FeedbackCreate) -> None:
    """A thumbs-down on a Market Signal (coin price) means the user doesn't
    want that asset in their briefing at all, not just this one card -- so
    remove it from their saved preferences. Coin price item ids are always
    "price-{symbol}" (see `_coin_price_item` in integrations.py)."""
    if payload.section_type != "COIN_PRICE" or payload.vote != "DOWN":
        return
    if not payload.item_id.startswith("price-"):
        return
    symbol = payload.item_id.removeprefix("price-")

    preferences = db.query(UserPreferences).filter(UserPreferences.user_id == current_user.id).first()
    if preferences is None or symbol not in preferences.assets:
        return
    if len(preferences.assets) <= 1:
        return  # keep at least one selected asset so the dashboard still has content

    preferences.assets = [asset for asset in preferences.assets if asset != symbol]
    db.add(preferences)


@router.post("", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
def submit_feedback(
    payload: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    feedback = (
        db.query(Feedback)
        .filter(
            Feedback.user_id == current_user.id,
            Feedback.section_type == payload.section_type,
            Feedback.item_id == payload.item_id,
        )
        .first()
    )
    if feedback is None:
        feedback = Feedback(
            user_id=current_user.id,
            section_type=payload.section_type,
            item_id=payload.item_id,
        )
        db.add(feedback)

    feedback.vote = payload.vote

    _maybe_remove_downvoted_asset(db, current_user, payload)

    db.commit()
    db.refresh(feedback)

    return _to_response(feedback)


@router.get("/me", response_model=list[FeedbackResponse])
def get_my_feedback(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    feedback_items = db.query(Feedback).filter(Feedback.user_id == current_user.id).all()
    return [_to_response(item) for item in feedback_items]
