import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getMe, getToken } from "@/lib/api";
import { Logo } from "@/components/cryptalks/Logo";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!getToken()) {
      navigate({ to: "/login", replace: true });
      return;
    }
    getMe()
      .then((me) => navigate({ to: me.onboardingCompleted ? "/dashboard" : "/onboarding", replace: true }))
      .catch(() => navigate({ to: "/login", replace: true }));
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Logo size="lg" />
        <div className="h-1 w-32 overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-1/2 animate-pulse rounded-full" style={{ background: "var(--gradient-aurora)" }} />
        </div>
        <p className="text-sm text-muted-foreground">Loading your briefing…</p>
      </div>
    </div>
  );
}
