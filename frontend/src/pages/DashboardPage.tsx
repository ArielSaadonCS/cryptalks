import { useNavigate } from "react-router-dom";
import { clearToken } from "../api";

export default function DashboardPage() {
  const navigate = useNavigate();

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
        <p className="disclaimer">
          Cryptalks provides market context and educational summaries only. It does not provide financial advice or
          trading recommendations.
        </p>
      </div>
    </div>
  );
}
