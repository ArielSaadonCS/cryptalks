import { useNavigate } from "react-router-dom";

export default function OnboardingPage() {
  const navigate = useNavigate();

  return (
    <div className="page-container">
      <div className="card">
        <h1>Cryptalks Onboarding</h1>
        <p>Your preferences will be configured here in the next phase.</p>
        <button type="button" onClick={() => navigate("/dashboard")}>
          Continue to dashboard demo
        </button>
      </div>
    </div>
  );
}
