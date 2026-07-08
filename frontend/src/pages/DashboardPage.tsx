import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, clearToken, DashboardData, getDashboardToday, getPreferences, Preferences } from "../api";
import DashboardCard from "../components/DashboardCard";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getPreferences(), getDashboardToday()])
      .then(([prefs, dashboardData]) => {
        if (cancelled) return;
        setPreferences(prefs);
        setDashboard(dashboardData);
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

      {dashboard && (
        <div className="dashboard-grid">
          <DashboardCard title="Market News">
            <ul className="news-list">
              {dashboard.marketNews.map((item) => (
                <li key={item.id} className="news-item">
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                  <div className="news-meta">
                    <span>{item.source}</span>
                    {item.relatedAssets.length > 0 && <span>{item.relatedAssets.join(", ")}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </DashboardCard>

          <DashboardCard title="Coin Prices">
            <table className="price-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Price</th>
                  <th>24h</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.coinPrices.map((coin) => (
                  <tr key={coin.id}>
                    <td>
                      <strong>{coin.symbol}</strong> <span className="coin-name">{coin.name}</span>
                    </td>
                    <td>${coin.priceUsd.toLocaleString()}</td>
                    <td className={coin.change24h >= 0 ? "positive" : "negative"}>
                      {coin.change24h >= 0 ? "+" : ""}
                      {coin.change24h}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DashboardCard>

          <DashboardCard title="AI Insight of the Day" className="insight-card">
            <h3>{dashboard.aiInsight.title}</h3>
            <p>{dashboard.aiInsight.content}</p>
          </DashboardCard>

          <DashboardCard title="Fun Crypto Meme">
            <p className="meme-title">{dashboard.meme.title}</p>
            <img className="meme-image" src={dashboard.meme.imageUrl} alt={dashboard.meme.title} />
          </DashboardCard>
        </div>
      )}
    </div>
  );
}
