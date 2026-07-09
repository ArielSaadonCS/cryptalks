import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { ApiError, getMe, login, setToken } from "@/lib/api";
import { Logo } from "@/components/cryptalks/Logo";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const auth = await login(email, password);
      setToken(auth.access_token);
      const me = await getMe();
      navigate({ to: me.onboardingCompleted ? "/dashboard" : "/onboarding", replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return <AuthShell>
    <div className="mb-8">
      <Logo />
    </div>
    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Welcome back</p>
    <h1 className="mt-2 text-3xl font-bold">Log in to <span className="gradient-text">Cryptalks</span></h1>
    <p className="mt-2 text-sm text-muted-foreground">Your personalized daily crypto briefing.</p>

    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      {error && (
        <div className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive-foreground">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <Field label="Email" id="email" type="email" value={email} onChange={setEmail} />
      <Field label="Password" id="password" type="password" value={password} onChange={setPassword} />
      <button
        type="submit"
        disabled={submitting}
        className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-60"
        style={{ background: "var(--gradient-aurora)", boxShadow: "var(--shadow-glow)" }}
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Log in <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>}
      </button>
    </form>
    <p className="mt-6 text-center text-sm text-muted-foreground">
      Don&apos;t have an account?{" "}
      <Link to="/signup" className="font-semibold text-foreground hover:underline">Sign up</Link>
    </p>
  </AuthShell>;
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full opacity-30 blur-3xl animate-float"
          style={{ background: "var(--gradient-aurora)" }} />
        <div className="absolute -right-32 bottom-1/4 h-96 w-96 rounded-full opacity-25 blur-3xl animate-float"
          style={{ background: "var(--gradient-mint)", animationDelay: "-3s" }} />
      </div>
      <div className="glass relative w-full max-w-md rounded-3xl p-8 sm:p-10">
        {children}
      </div>
    </div>
  );
}

export function Field({
  label, id, type, value, onChange, hint,
}: { label: string; id: string; type: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary/60 focus:bg-secondary/70 focus:ring-4 focus:ring-primary/15"
      />
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
