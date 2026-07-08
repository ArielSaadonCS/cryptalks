import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, getPreferences, savePreferences } from "../api";

const ASSET_OPTIONS = ["BTC", "ETH", "SOL", "ADA", "XRP", "DOGE", "AVAX", "LINK", "MATIC", "DOT"];
const INVESTOR_TYPE_OPTIONS = ["HODLer", "Day Trader", "NFT Collector", "Beginner", "Researcher"];
const CONTENT_TYPE_OPTIONS = ["Market News", "Charts", "AI Insights", "Fun"];
const RISK_LEVEL_OPTIONS = ["Low", "Medium", "High"];

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export default function OnboardingPage() {
  const navigate = useNavigate();

  const [assets, setAssets] = useState<string[]>([]);
  const [investorType, setInvestorType] = useState("");
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [riskLevel, setRiskLevel] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getPreferences()
      .then((prefs) => {
        if (cancelled) return;
        setAssets(prefs.assets);
        setInvestorType(prefs.investorType);
        setContentTypes(prefs.contentTypes);
        setRiskLevel(prefs.riskLevel);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          return;
        }
        setLoadError(err instanceof ApiError ? err.message : "Could not load your preferences. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (assets.length === 0) {
      setFormError("Please select at least one crypto asset.");
      return;
    }
    if (!investorType) {
      setFormError("Please select an investor type.");
      return;
    }
    if (contentTypes.length === 0) {
      setFormError("Please select at least one content type.");
      return;
    }
    if (!riskLevel) {
      setFormError("Please select a risk level.");
      return;
    }

    setSaving(true);
    try {
      await savePreferences({ assets, investorType, contentTypes, riskLevel });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <div className="page-container">
      <form className="card onboarding-card" onSubmit={handleSubmit}>
        <h1>Cryptalks Onboarding</h1>
        <p className="auth-subtitle">
          Tell us what you care about so we can personalize your daily crypto briefing.
        </p>

        {loadError && <div className="error-message">{loadError}</div>}
        {formError && <div className="error-message">{formError}</div>}

        <fieldset className="form-section">
          <legend>Which crypto assets are you interested in?</legend>
          <div className="checkbox-grid">
            {ASSET_OPTIONS.map((asset) => (
              <label key={asset} className="checkbox-option">
                <input
                  type="checkbox"
                  checked={assets.includes(asset)}
                  onChange={() => setAssets(toggleValue(assets, asset))}
                />
                {asset}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>What type of investor are you?</legend>
          <div className="radio-group">
            {INVESTOR_TYPE_OPTIONS.map((type) => (
              <label key={type} className="radio-option">
                <input
                  type="radio"
                  name="investorType"
                  checked={investorType === type}
                  onChange={() => setInvestorType(type)}
                />
                {type}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>What kind of content would you like to see?</legend>
          <div className="checkbox-grid">
            {CONTENT_TYPE_OPTIONS.map((type) => (
              <label key={type} className="checkbox-option">
                <input
                  type="checkbox"
                  checked={contentTypes.includes(type)}
                  onChange={() => setContentTypes(toggleValue(contentTypes, type))}
                />
                {type}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>What is your risk level?</legend>
          <div className="radio-group">
            {RISK_LEVEL_OPTIONS.map((level) => (
              <label key={level} className="radio-option">
                <input
                  type="radio"
                  name="riskLevel"
                  checked={riskLevel === level}
                  onChange={() => setRiskLevel(level)}
                />
                {level}
              </label>
            ))}
          </div>
        </fieldset>

        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save preferences"}
        </button>
      </form>
    </div>
  );
}
