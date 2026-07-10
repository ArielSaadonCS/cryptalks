// Signup page, reusing AuthShell/Field from login.tsx.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { ApiError, setToken, signup } from "@/lib/api";
import { Logo } from "@/components/cryptalks/Logo";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { AuthShell, Field } from "./login";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const auth = await signup(name, email, password);
      setToken(auth.access_token);
      navigate({ to: "/onboarding", replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div className="mb-8"><Logo /></div>
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Get started</p>
      <h1 className="mt-2 text-3xl font-bold">Create your <span className="gradient-text">Cryptalks</span> account</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        A personalized daily crypto briefing — context, not trading advice.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {error && (
          <div className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive-foreground">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <Field label="Name" id="name" type="text" value={name} onChange={setName} />
        <Field label="Email" id="email" type="email" value={email} onChange={setEmail} />
        <Field
          label="Password"
          id="password"
          type="password"
          value={password}
          onChange={setPassword}
          hint="At least 8 characters — upper, lower, number, and special (! @ # $ % ^ & * _ - ?)."
        />
        <button
          type="submit"
          disabled={submitting}
          className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-60"
          style={{ background: "var(--gradient-aurora)", boxShadow: "var(--shadow-glow)" }}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create account <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-foreground hover:underline">Log in</Link>
      </p>
    </AuthShell>
  );
}
