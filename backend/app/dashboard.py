from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.integrations import generate_ai_insight, get_coin_prices, get_market_news, pick_meme
from app.models import Feedback, User, UserPreferences
from app.schemas import AIInsightItem, CoinPriceItem, DashboardResponse, MarketNewsItem, MemeItem

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/today", response_model=DashboardResponse)
def get_today_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    preferences = db.query(UserPreferences).filter(UserPreferences.user_id == current_user.id).first()
    if preferences is None or not preferences.onboarding_completed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Complete onboarding before viewing the dashboard",
        )

    coin_prices = get_coin_prices(preferences.assets, db)
    market_news = get_market_news(preferences.assets)

    feedback_rows = db.query(Feedback).filter(Feedback.user_id == current_user.id).all()
    feedback_items = [{"sectionType": row.section_type, "itemId": row.item_id, "vote": row.vote} for row in feedback_rows]

    ai_insight = generate_ai_insight(preferences, coin_prices, market_news, feedback_items)
    meme = pick_meme(current_user.id)

    return DashboardResponse(
        market_news=[MarketNewsItem(**item) for item in market_news],
        coin_prices=[CoinPriceItem(**item) for item in coin_prices],
        ai_insight=AIInsightItem(**ai_insight),
        meme=MemeItem(**meme),
    )
