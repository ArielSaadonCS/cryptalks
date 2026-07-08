import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ApiError,
  clearToken,
  DashboardData,
  getDashboardToday,
  getMyFeedback,
  getPreferences,
  Preferences,
  SectionType,
  submitFeedback,
  Vote,
} from "../api";
import DashboardCard from "../components/DashboardCard";
import FeedbackButtons from "../components/FeedbackButtons";

function feedbackKey(sectionType: SectionType, itemId: string): string {
  return `${sectionType}:${itemId}`;
}

function newsSourceLabel(isFallback: boolean): string {
  return isFallback ? "Fallback news" : "Live news";
}

function insightSourceLabel(isFallback: boolean): string {
  return isFallback ? "Fallback insight" : "AI-generated insight";
}

function coinSourceLabel(source: string): string {
  switch (source) {
    case "live":
      return "Live data";
    case "cache":
      return "Cached data";
    case "static":
      return "Fallback data";
    default:
      return "";
  }
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [feedback, setFeedback] = useState<Record<string, Vote>>({});
  const [feedbackSubmitting, setFeedbackSubmitting] = useState<Record<string, boolean>>({});
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getPreferences(), getDashboardToday(), getMyFeedback()])
      .then(([prefs, dashboardData, feedbackItems]) => {
        if (cancelled) return;
        setPreferences(prefs);
        setDashboard(dashboardData);

        const map: Record<string, Vote> = {};
        for (const item of feedbackItems) {
          map[feedbackKey(item.sectionType, item.itemId)] = item.vote;
        }
        setFeedback(map);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 403) {
          navigate("/onboarding", { replace: true });
          return;
        }
        setError(err instanceof ApiError ? err.message : "Could not load your dashboard. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function handleVote(sectionType: SectionType, itemId: string, vote: Vote) {
    const key = feedbackKey(sectionType, itemId);
    setFeedbackError(null);
    setFeedbackSubmitting((prev) => ({ ...prev, [key]: true }));

    try {
      await submitFeedback({ sectionType, itemId, vote });
      setFeedback((prev) => ({ ...prev, [key]: vote }));
    } catch (err) {
      setFeedbackError(err instanceof ApiError ? err.message : "Could not save your feedback. Please try again.");
    } finally {
      setFeedbackSubmitting((prev) => ({ ...prev, [key]: false }));
    }
  }

  function handleLogout() {
    clearToken();
    navigate("/login", { replace: true });
  }

  if (loading) {
    return <div className="loading-screen">Loading your briefing...</div>;
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-page-header">
        <div>
          <h1>Cryptalks</h1>
          <p className="auth-subtitle">Your personalized daily crypto briefing</p>
        </div>
        <button type="button" className="secondary" onClick={handleLogout}>
          Log out
        </button>
      </header>

      {error && <div className="error-message">{error}</div>}

      {preferences && (
        <div className="preferences-summary">
          <h2>Your preferences</h2>
          <dl>
            <dt>Assets</dt>
            <dd>{preferences.assets.join(", ")}</dd>
            <dt>Investor type</dt>
            <dd>{preferences.investorType}</dd>
            <dt>Content types</dt>
            <dd>{preferences.contentTypes.join(", ")}</dd>
            <dt>Risk level</dt>
            <dd>{preferences.riskLevel}</dd>
          </dl>
        </div>
      )}

      <p className="disclaimer">
        Cryptalks provides market context and educational summaries only. It does not provide financial advice or
        trading recommendations.
      </p>

      <p className="feedback-note">
        Your feedback helps Cryptalks learn which content is useful to you. It does not directly change your saved
        onboarding preferences.
      </p>

      {feedbackError && <div className="error-message">{feedbackError}</div>}

      {dashboard && (
        <div className="dashboard-grid">
          <DashboardCard title="Market News">
            <ul className="news-list">
              {dashboard.marketNews.map((item) => {
                const key = feedbackKey("MARKET_NEWS", item.id);
                return (
                  <li key={item.id} className="news-item">
                    <h3>
                      {item.url ? (
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          {item.title}
                        </a>
                      ) : (
                        item.title
                      )}
                    </h3>
                    <p>{item.summary}</p>
                    <div className="news-meta">
                      <span>{item.source}</span>
                      {item.relatedAssets.length > 0 && <span>{item.relatedAssets.join(", ")}</span>}
                      <span className={`news-badge${item.isFallback ? "" : " news-badge--live"}`}>
                        {newsSourceLabel(item.isFallback)}
                      </span>
                    </div>
                    <FeedbackButtons
                      sectionType="MARKET_NEWS"
                      itemId={item.id}
                      prompt="Was this useful?"
                      vote={feedback[key] ?? null}
                      submitting={!!feedbackSubmitting[key]}
                      onVote={handleVote}
                    />
                  </li>
                );
              })}
            </ul>
          </DashboardCard>

          <DashboardCard title="Coin Prices">
            <table className="price-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Price</th>
                  <th>24h</th>
                  <th>Feedback</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.coinPrices.map((coin) => {
                  const key = feedbackKey("COIN_PRICE", coin.id);
                  return (
                    <tr key={coin.id}>
                      <td>
                        <strong>{coin.symbol}</strong> <span className="coin-name">{coin.name}</span>
                        <div className={`price-source price-source--${coin.source}`}>
                          {coinSourceLabel(coin.source)}
                        </div>
                      </td>
                      <td>
                        ${coin.priceUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className={coin.change24h >= 0 ? "positive" : "negative"}>
                        {coin.change24h >= 0 ? "+" : ""}
                        {coin.change24h.toFixed(1)}%
                      </td>
                      <td>
                        <FeedbackButtons
                          sectionType="COIN_PRICE"
                          itemId={coin.id}
                          vote={feedback[key] ?? null}
                          submitting={!!feedbackSubmitting[key]}
                          onVote={handleVote}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DashboardCard>

          <DashboardCard title="AI Insight of the Day" className="insight-card">
            <div className="insight-header">
              <h3>{dashboard.aiInsight.title}</h3>
              <span className={`insight-badge${dashboard.aiInsight.isFallback ? "" : " insight-badge--live"}`}>
                {insightSourceLabel(dashboard.aiInsight.isFallback)}
              </span>
            </div>
            <p>{dashboard.aiInsight.content}</p>
            <FeedbackButtons
              sectionType="AI_INSIGHT"
              itemId={dashboard.aiInsight.id}
              prompt="Was this insight useful?"
              vote={feedback[feedbackKey("AI_INSIGHT", dashboard.aiInsight.id)] ?? null}
              submitting={!!feedbackSubmitting[feedbackKey("AI_INSIGHT", dashboard.aiInsight.id)]}
              onVote={handleVote}
            />
          </DashboardCard>

          <DashboardCard title="Fun Crypto Meme">
            <p className="meme-title">{dashboard.meme.title}</p>
            <img className="meme-image" src={dashboard.meme.imageUrl} alt={dashboard.meme.title} />
            <FeedbackButtons
              sectionType="MEME"
              itemId={dashboard.meme.id}
              prompt="Did this match your crypto mood?"
              vote={feedback[feedbackKey("MEME", dashboard.meme.id)] ?? null}
              submitting={!!feedbackSubmitting[feedbackKey("MEME", dashboard.meme.id)]}
              onVote={handleVote}
            />
          </DashboardCard>
        </div>
      )}
    </div>
  );
}
