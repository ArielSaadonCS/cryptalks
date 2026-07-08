"""External data sources for the dashboard.

Coin prices are fetched live from CoinGecko when possible, with a PostgreSQL
cache and a static fallback so the dashboard never fails just because the
external API is slow or unavailable. Market news and memes are still
mock/static data for this phase.
"""

from datetime import datetime, timezone

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.models import CachedCoinPrice, UserPreferences

COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price"
COINGECKO_TIMEOUT_SECONDS = 5.0

COINGECKO_IDS: dict[str, str] = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "SOL": "solana",
    "ADA": "cardano",
    "XRP": "ripple",
    "DOGE": "dogecoin",
    "AVAX": "avalanche-2",
    "LINK": "chainlink",
    "MATIC": "matic-network",
    "DOT": "polkadot",
}

# Final backup if both CoinGecko and the PostgreSQL cache are unavailable for an asset.
STATIC_COIN_PRICES: dict[str, dict[str, object]] = {
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


def _fetch_live_prices(symbols: list[str]) -> dict[str, dict[str, object]] | None:
    """Try to fetch live prices from CoinGecko. Returns None on any failure."""
    ids = [COINGECKO_IDS[symbol] for symbol in symbols if symbol in COINGECKO_IDS]
    if not ids:
        return None

    params = {"ids": ",".join(ids), "vs_currencies": "usd", "include_24hr_change": "true"}
    headers = {"x-cg-demo-api-key": settings.coingecko_api_key} if settings.coingecko_api_key else {}

    try:
        response = httpx.get(COINGECKO_URL, params=params, headers=headers, timeout=COINGECKO_TIMEOUT_SECONDS)
        response.raise_for_status()
        data = response.json()
    except Exception as exc:  # network errors, timeouts, bad JSON, non-2xx status, etc.
        print(f"[integrations] CoinGecko request failed, falling back: {exc}")
        return None

    id_to_symbol = {coingecko_id: symbol for symbol, coingecko_id in COINGECKO_IDS.items()}
    results: dict[str, dict[str, object]] = {}
    for coingecko_id, values in data.items():
        symbol = id_to_symbol.get(coingecko_id)
        if symbol is None or "usd" not in values:
            continue
        results[symbol] = {
            "name": STATIC_COIN_PRICES.get(symbol, {}).get("name", symbol),
            "priceUsd": float(values["usd"]),
            "change24h": float(values.get("usd_24h_change") or 0.0),
        }

    return results or None


def _save_cached_prices(db: Session, live_prices: dict[str, dict[str, object]]) -> None:
    fetched_at = datetime.now(timezone.utc)
    for symbol, values in live_prices.items():
        cached = db.query(CachedCoinPrice).filter(CachedCoinPrice.symbol == symbol).first()
        if cached is None:
            cached = CachedCoinPrice(symbol=symbol)
            db.add(cached)
        cached.name = values["name"]
        cached.price_usd = values["priceUsd"]
        cached.change_24h = values["change24h"]
        cached.fetched_at = fetched_at
    db.commit()


def _get_cached_prices(db: Session, symbols: list[str]) -> dict[str, CachedCoinPrice]:
    rows = db.query(CachedCoinPrice).filter(CachedCoinPrice.symbol.in_(symbols)).all()
    return {row.symbol: row for row in rows}


def _coin_price_item(symbol: str, name: str, price_usd: float, change_24h: float, is_fallback: bool, source: str) -> dict[str, object]:
    return {
        "id": f"price-{symbol}",
        "symbol": symbol,
        "name": name,
        "priceUsd": price_usd,
        "change24h": change_24h,
        "isFallback": is_fallback,
        "source": source,
    }


def get_coin_prices(assets: list[str], db: Session) -> list[dict[str, object]]:
    """Return prices for the given assets: live from CoinGecko where possible,
    otherwise the last cached price from PostgreSQL, otherwise static fallback
    data. Only returns items for assets we actually support."""
    symbols = [symbol.upper() for symbol in assets if symbol.upper() in COINGECKO_IDS]
    if not symbols:
        return []

    live_prices = _fetch_live_prices(symbols) or {}
    if live_prices:
        _save_cached_prices(db, live_prices)

    cached_prices = _get_cached_prices(db, symbols)

    results: list[dict[str, object]] = []
    for symbol in symbols:
        if symbol in live_prices:
            live = live_prices[symbol]
            results.append(_coin_price_item(symbol, live["name"], live["priceUsd"], live["change24h"], False, "live"))
        elif symbol in cached_prices:
            cached = cached_prices[symbol]
            results.append(
                _coin_price_item(symbol, cached.name, cached.price_usd, cached.change_24h or 0.0, True, "cache")
            )
        elif symbol in STATIC_COIN_PRICES:
            static = STATIC_COIN_PRICES[symbol]
            results.append(
                _coin_price_item(symbol, static["name"], static["priceUsd"], static["change24h"], True, "static")
            )

    return results


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

    all_live = bool(coin_prices) and all(item.get("source") == "live" for item in coin_prices)
    dataset_label = "live" if all_live else "reference"

    movers = sorted(coin_prices, key=lambda item: item["change24h"], reverse=True)
    observations: list[str] = []
    if movers:
        top = movers[0]
        direction = "a positive" if top["change24h"] >= 0 else "a negative"
        observations.append(
            f"{top['symbol']} is showing {direction} 24h move of {top['change24h']:.1f}% in this {dataset_label} dataset."
        )
    if len(movers) > 1 and movers[-1]["symbol"] != movers[0]["symbol"]:
        bottom = movers[-1]
        direction = "a positive" if bottom["change24h"] >= 0 else "a negative"
        observations.append(f"{bottom['symbol']} shows {direction} 24h move of {bottom['change24h']:.1f}%.")
    observation_text = " ".join(observations) if observations else "Market data is steady across the board today."

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
