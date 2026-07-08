"""Mock/static data sources for the dashboard.

This phase does not call any real external APIs (CoinGecko, CryptoPanic,
OpenRouter, etc.). Every function here returns deterministic, static data so
the dashboard can be personalized without a network dependency.
"""

from app.models import UserPreferences

COIN_METADATA: dict[str, dict[str, object]] = {
    "BTC": {"name": "Bitcoin", "priceUsd": 65000.0, "change24h": 2.4},
    "ETH": {"name": "Ethereum", "priceUsd": 3400.0, "change24h": 1.1},
    "SOL": {"name": "Solana", "priceUsd": 145.0, "change24h": 5.6},
    "ADA": {"name": "Cardano", "priceUsd": 0.45, "change24h": -1.2},
    "XRP": {"name": "XRP", "priceUsd": 0.62, "change24h": 0.8},
    "DOGE": {"name": "Dogecoin", "priceUsd": 0.15, "change24h": 3.9},
    "AVAX": {"name": "Avalanche", "priceUsd": 28.0, "change24h": -0.5},
    "LINK": {"name": "Chainlink", "priceUsd": 14.5, "change24h": 2.1},
    "MATIC": {"name": "Polygon", "priceUsd": 0.78, "change24h": -2.3},
    "DOT": {"name": "Polkadot", "priceUsd": 6.9, "change24h": 1.7},
}

MOCK_NEWS: list[dict[str, object]] = [
    {
        "id": "news-btc-1",
        "title": "Bitcoin market activity increases",
        "summary": "On-chain data shows more wallets active in the last 24 hours, a pattern worth noting.",
        "source": "Mock News",
        "relatedAssets": ["BTC"],
    },
    {
        "id": "news-eth-1",
        "title": "Ethereum network activity remains steady",
        "summary": "Gas usage and transaction counts held steady, suggesting consistent network demand.",
        "source": "Mock News",
        "relatedAssets": ["ETH"],
    },
    {
        "id": "news-sol-1",
        "title": "Solana ecosystem sees continued developer interest",
        "summary": "New project launches on Solana continue at a steady pace this week.",
        "source": "Mock News",
        "relatedAssets": ["SOL"],
    },
    {
        "id": "news-general-1",
        "title": "Crypto markets show mixed movement today",
        "summary": "Major assets moved in different directions, reflecting a lack of a single dominant market theme.",
        "source": "Mock News",
        "relatedAssets": [],
    },
    {
        "id": "news-general-2",
        "title": "Analysts discuss broader market context",
        "summary": "Commentary today focused on macro context rather than short-term price predictions.",
        "source": "Mock News",
        "relatedAssets": [],
    },
]

MOCK_MEMES: list[dict[str, object]] = [
    {
        "id": "meme-1",
        "title": "Crypto mood today",
        "imageUrl": "https://placehold.co/600x350?text=Crypto+Meme",
    },
    {
        "id": "meme-2",
        "title": "HODL vibes",
        "imageUrl": "https://placehold.co/600x350?text=HODL",
    },
    {
        "id": "meme-3",
        "title": "Market watchers everywhere",
        "imageUrl": "https://placehold.co/600x350?text=Diamond+Hands",
    },
]

_RISK_NOTES = {
    "Low": "the briefing leans toward steadier, lower-volatility context",
    "Medium": "the briefing balances steady context with notable market moves",
    "High": "the briefing highlights more volatile market moves that may be relevant to a higher risk tolerance",
}


def build_coin_prices(assets: list[str]) -> list[dict[str, object]]:
    return [
        {
            "id": f"price-{symbol}",
            "symbol": symbol,
            "name": COIN_METADATA[symbol]["name"],
            "priceUsd": COIN_METADATA[symbol]["priceUsd"],
            "change24h": COIN_METADATA[symbol]["change24h"],
        }
        for symbol in assets
        if symbol in COIN_METADATA
    ]


def build_market_news(assets: list[str]) -> list[dict[str, object]]:
    selected = set(assets)
    matched = [item for item in MOCK_NEWS if set(item["relatedAssets"]) & selected]
    general = [item for item in MOCK_NEWS if not item["relatedAssets"]]

    news = list(matched)
    for item in general:
        if len(news) >= 4:
            break
        if item not in news:
            news.append(item)

    if len(news) < 2:
        for item in MOCK_NEWS:
            if len(news) >= 2:
                break
            if item not in news:
                news.append(item)

    return news[:4]


def pick_meme(user_id: int) -> dict[str, object]:
    return MOCK_MEMES[user_id % len(MOCK_MEMES)]


def build_ai_insight(preferences: UserPreferences, coin_prices: list[dict[str, object]]) -> dict[str, object]:
    assets_text = ", ".join(preferences.assets)
    content_text = ", ".join(preferences.content_types)

    movers = sorted(coin_prices, key=lambda item: item["change24h"], reverse=True)
    observations: list[str] = []
    if movers:
        top = movers[0]
        direction = "a positive" if top["change24h"] >= 0 else "a negative"
        observations.append(
            f"{top['symbol']} is showing {direction} 24h move of {top['change24h']}% in this mock dataset."
        )
    if len(movers) > 1 and movers[-1]["symbol"] != movers[0]["symbol"]:
        bottom = movers[-1]
        direction = "a positive" if bottom["change24h"] >= 0 else "a negative"
        observations.append(f"{bottom['symbol']} shows {direction} 24h move of {bottom['change24h']}%.")
    observation_text = " ".join(observations) if observations else "Mock market data is steady across the board today."

    risk_note = _RISK_NOTES.get(preferences.risk_level, "the briefing reflects your selected risk level")

    content = (
        f"Because you selected {assets_text} and described yourself as a {preferences.investor_type}, "
        f"today's briefing focuses on content like {content_text}. {observation_text} "
        f"Given your {preferences.risk_level} risk level, {risk_note}. "
        "This may be useful context, but Cryptalks does not provide financial advice or trading recommendations."
    )

    return {
        "id": "insight-today",
        "title": "Your personalized crypto context",
        "content": content,
    }
