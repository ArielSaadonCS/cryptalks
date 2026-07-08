import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getMe, getToken, User } from "../api";

interface ProtectedRouteProps {
  requireOnboardingCompleted?: boolean;
  redirectIfOnboardingCompleted?: boolean;
}

type Status = "loading" | "authed" | "unauthed";

export default function ProtectedRoute({
  requireOnboardingCompleted = false,
  redirectIfOnboardingCompleted = false,
}: ProtectedRouteProps) {
  const location = useLocation();
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    if (!getToken()) {
      setStatus("unauthed");
      return;
    }

    getMe()
      .then((me) => {
        if (!cancelled) {
          setUser(me);
          setStatus("authed");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("unauthed");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (status === "loading") {
    return <div className="loading-screen">Loading...</div>;
  }

  if (status === "unauthed" || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requireOnboardingCompleted && !user.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  if (redirectIfOnboardingCompleted && user.onboardingCompleted) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
