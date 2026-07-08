from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Feedback, User
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
