from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.integrations import generate_ai_insight, get_coin_prices, get_market_news, pick_meme
from app.models import Feedback, User, UserPreferences
from app.schemas import (
    AIInsightItem,
    AIInsightRefreshRequest,
    CoinPriceItem,
    DashboardResponse,
    MarketNewsItem,
    MemeItem,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _downvoted_item_ids(feedback_rows: list[Feedback], section_type: str) -> set[str]:
    return {row.item_id for row in feedback_rows if row.section_type == section_type and row.vote == "DOWN"}


def _load_preferences(current_user: User, db: Session) -> UserPreferences:
    preferences = db.query(UserPreferences).filter(UserPreferences.user_id == current_user.id).first()
    if preferences is None or not preferences.onboarding_completed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Complete onboarding before viewing the dashboard",
        )
    return preferences


@router.get("/today", response_model=DashboardResponse)
def get_today_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    preferences = _load_preferences(current_user, db)

    feedback_rows = db.query(Feedback).filter(Feedback.user_id == current_user.id).all()
    feedback_items = [{"sectionType": row.section_type, "itemId": row.item_id, "vote": row.vote} for row in feedback_rows]

    coin_prices = get_coin_prices(preferences.assets, db)
    market_news = get_market_news(preferences.assets, _downvoted_item_ids(feedback_rows, "MARKET_NEWS"))
    ai_insight = generate_ai_insight(
        preferences, coin_prices, market_news, feedback_items,
        excluded_ids=_downvoted_item_ids(feedback_rows, "AI_INSIGHT"),
    )
    meme = pick_meme(current_user.id, _downvoted_item_ids(feedback_rows, "MEME"))

    return DashboardResponse(
        market_news=[MarketNewsItem(**item) for item in market_news],
        coin_prices=[CoinPriceItem(**item) for item in coin_prices],
        ai_insight=AIInsightItem(**ai_insight),
        meme=MemeItem(**meme),
    )


@router.post("/ai-insight/refresh", response_model=AIInsightItem)
def refresh_ai_insight(
    payload: AIInsightRefreshRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Regenerate the AI Insight of the Day after the user gives it a
    thumbs-down. Builds it from the same live context as the normal dashboard,
    but explicitly steers generation away from the rejected text (see
    `generate_ai_insight`'s `avoid_content`) so the replacement isn't a repeat."""
    preferences = _load_preferences(current_user, db)

    feedback_rows = db.query(Feedback).filter(Feedback.user_id == current_user.id).all()
    feedback_items = [{"sectionType": row.section_type, "itemId": row.item_id, "vote": row.vote} for row in feedback_rows]

    coin_prices = get_coin_prices(preferences.assets, db)
    market_news = get_market_news(preferences.assets, _downvoted_item_ids(feedback_rows, "MARKET_NEWS"))
    ai_insight = generate_ai_insight(
        preferences, coin_prices, market_news, feedback_items,
        avoid_content=payload.previous_content,
        excluded_ids=_downvoted_item_ids(feedback_rows, "AI_INSIGHT"),
    )

    return AIInsightItem(**ai_insight)
