import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, clearToken, getPreferences, Preferences } from "../api";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getPreferences()
      .then((prefs) => {
        if (!cancelled) setPreferences(prefs);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          return;
        }
        setError(err instanceof ApiError ? err.message : "Could not load your preferences.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleLogout() {
    clearToken();
    navigate("/login", { replace: true });
  }

  return (
    <div className="page-container">
      <div className="card dashboard-card">
        <div className="dashboard-header">
          <h1>Welcome to Cryptalks</h1>
          <button type="button" className="secondary" onClick={handleLogout}>
            Log out
          </button>
        </div>
        <p>Your personalized daily crypto briefing will appear here.</p>

        {loading && <p className="field-hint">Loading your preferences...</p>}
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
      </div>
    </div>
  );
}
