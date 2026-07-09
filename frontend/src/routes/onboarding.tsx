import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ApiError, getMe, getPreferences, getToken, savePreferences } from "@/lib/api";
import { Logo } from "@/components/cryptalks/Logo";
import { cn } from "@/lib/utils";
import {
  AlertCircle, ArrowLeft, ArrowRight, Check, Coins, Compass,
  Flame, Leaf, Loader2, Newspaper, LineChart, Sparkles, Smile, Zap,
} from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

const ASSET_OPTIONS = [
  { v: "BTC", label: "Bitcoin", color: "amber" },
  { v: "ETH", label: "Ethereum", color: "violet" },
  { v: "SOL", label: "Solana", color: "cyan" },
  { v: "ADA", label: "Cardano", color: "cyan" },
  { v: "XRP", label: "XRP", color: "violet" },
  { v: "DOGE", label: "Dogecoin", color: "amber" },
  { v: "AVAX", label: "Avalanche", color: "rose" },
  { v: "LINK", label: "Chainlink", color: "cyan" },
  { v: "MATIC", label: "Polygon", color: "violet" },
  { v: "DOT", label: "Polkadot", color: "rose" },
];
const INVESTOR_TYPES = [
  { v: "HODLer", label: "HODLer", desc: "Long-term believer", icon: Leaf },
  { v: "Day Trader", label: "Day Trader", desc: "Fast moves, real charts", icon: Zap },
  { v: "NFT Collector", label: "NFT Collector", desc: "Culture & collectibles", icon: Sparkles },
  { v: "Beginner", label: "Beginner", desc: "Learning the ropes", icon: Compass },
  { v: "Researcher", label: "Researcher", desc: "Data-first mindset", icon: LineChart },
];
const CONTENT_TYPES = [
  { v: "Market News", icon: Newspaper },
  { v: "Charts", icon: LineChart },
  { v: "AI Insights", icon: Sparkles },
  { v: "Fun", icon: Smile },
];
const RISK_LEVELS = [
  { v: "Low", label: "Low", desc: "Slow & steady", icon: Leaf, color: "emerald" },
  { v: "Medium", label: "Medium", desc: "Balanced approach", icon: Coins, color: "amber" },
  { v: "High", label: "High", desc: "Volatility welcome", icon: Flame, color: "rose" },
];

function toggle(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [assets, setAssets] = useState<string[]>([]);
  const [investorType, setInvestorType] = useState("");
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [riskLevel, setRiskLevel] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!getToken()) { navigate({ to: "/login", replace: true }); return; }
    let cancelled = false;
    (async () => {
      try {
        const me = await getMe();
        if (me.onboardingCompleted) { navigate({ to: "/dashboard", replace: true }); return; }
      } catch { navigate({ to: "/login", replace: true }); return; }
      try {
        const prefs = await getPreferences();
        if (cancelled) return;
        setAssets(prefs.assets);
        setInvestorType(prefs.investorType);
        setContentTypes(prefs.contentTypes);
        setRiskLevel(prefs.riskLevel);
      } catch (err) {
        if (cancelled) return;
        if (!(err instanceof ApiError && err.status === 404)) {
          setLoadError(err instanceof ApiError ? err.message : "Could not load your preferences.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  const steps = useMemo(
    () => [
      { key: "assets", label: "Assets", valid: assets.length > 0 },
      { key: "investor", label: "Investor", valid: !!investorType },
      { key: "content", label: "Content", valid: contentTypes.length > 0 },
      { key: "risk", label: "Risk", valid: !!riskLevel },
    ],
    [assets, investorType, contentTypes, riskLevel],
  );
  const progress = ((step + 1) / steps.length) * 100;

  function next() {
    setFormError(null);
    if (!steps[step].valid) {
      const messages = [
        "Please select at least one crypto asset.",
        "Please select an investor type.",
        "Please select at least one content type.",
        "Please select a risk level.",
      ];
      setFormError(messages[step]);
      return;
    }
    if (step < steps.length - 1) setStep(step + 1);
    else submit();
  }
  function back() { setFormError(null); if (step > 0) setStep(step - 1); }

  async function submit() {
    setSaving(true);
    setFormError(null);
    try {
      await savePreferences({ assets, investorType, contentTypes, riskLevel });
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally { setSaving(false); }
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="relative min-h-screen px-4 py-10 sm:py-16">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-[500px] w-[500px] rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--gradient-aurora)" }} />
      </div>
      <div className="relative mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <Logo />
          <span className="font-mono text-xs text-muted-foreground">
            Step {step + 1} / {steps.length}
          </span>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="mb-2 flex justify-between">
            {steps.map((s, i) => (
              <button
                key={s.key}
                type="button"
                onClick={() => (i < step || s.valid ? setStep(i) : null)}
                className={cn(
                  "text-xs font-medium transition",
                  i === step ? "text-foreground" : i < step ? "text-primary" : "text-muted-foreground",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary/60">
            <div
              className="h-full transition-all duration-500 rounded-full"
              style={{ width: `${progress}%`, background: "var(--gradient-aurora)" }}
            />
          </div>
        </div>

        <div className="glass rounded-3xl p-6 sm:p-10">
          {loadError && (
            <div className="mb-4 flex gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />{loadError}
            </div>
          )}
          {formError && (
            <div className="mb-4 flex gap-2 rounded-xl border border-amber/30 bg-amber/10 p-3 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-amber" />{formError}
            </div>
          )}

          {step === 0 && (
            <StepShell
              eyebrow="Step 1 · Portfolio"
              title="Which crypto assets are you following?"
              subtitle="Pick a few — we'll tailor your daily briefing to what you care about."
            >
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {ASSET_OPTIONS.map((a) => {
                  const active = assets.includes(a.v);
                  return (
                    <button
                      key={a.v}
                      type="button"
                      onClick={() => setAssets(toggle(assets, a.v))}
                      className={cn(
                        "group relative flex items-center gap-2 rounded-xl border p-3 text-left transition-all",
                        active
                          ? "border-primary/60 bg-primary/10 shadow-[0_0_0_1px_var(--primary)]"
                          : "border-border bg-secondary/30 hover:border-white/20 hover:bg-secondary/50",
                      )}
                    >
                      <span className="font-mono text-sm font-bold">{a.v}</span>
                      <span className="truncate text-xs text-muted-foreground">{a.label}</span>
                      {active && <Check className="ml-auto h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </StepShell>
          )}

          {step === 1 && (
            <StepShell
              eyebrow="Step 2 · Style"
              title="What kind of investor are you?"
              subtitle="Just pick the one that fits best. You can change this later."
            >
              <div className="grid gap-2.5 sm:grid-cols-2">
                {INVESTOR_TYPES.map(({ v, label, desc, icon: Icon }) => {
                  const active = investorType === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setInvestorType(v)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
                        active
                          ? "border-primary/60 bg-primary/10"
                          : "border-border bg-secondary/30 hover:border-white/20",
                      )}
                    >
                      <div className={cn(
                        "grid h-10 w-10 shrink-0 place-items-center rounded-lg transition",
                        active ? "bg-primary/25 text-primary" : "bg-secondary text-muted-foreground",
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{label}</div>
                        <div className="text-xs text-muted-foreground truncate">{desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </StepShell>
          )}

          {step === 2 && (
            <StepShell
              eyebrow="Step 3 · Content"
              title="What do you want to see every day?"
              subtitle="Pick everything that sounds useful. Mix and match freely."
            >
              <div className="grid grid-cols-2 gap-2.5">
                {CONTENT_TYPES.map(({ v, icon: Icon }) => {
                  const active = contentTypes.includes(v);
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setContentTypes(toggle(contentTypes, v))}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-4 transition-all",
                        active
                          ? "border-primary/60 bg-primary/10"
                          : "border-border bg-secondary/30 hover:border-white/20",
                      )}
                    >
                      <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
                      <span className="font-medium">{v}</span>
                      {active && <Check className="ml-auto h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </StepShell>
          )}

          {step === 3 && (
            <StepShell
              eyebrow="Step 4 · Risk"
              title="How much volatility are you comfortable with?"
              subtitle="This shapes the tone of your insights — not financial advice."
            >
              <div className="grid gap-2.5 sm:grid-cols-3">
                {RISK_LEVELS.map(({ v, label, desc, icon: Icon, color }) => {
                  const active = riskLevel === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setRiskLevel(v)}
                      className={cn(
                        "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
                        active ? "border-primary/60 bg-primary/10" : "border-border bg-secondary/30 hover:border-white/20",
                      )}
                    >
                      <div className={cn(
                        "grid h-10 w-10 place-items-center rounded-lg",
                        color === "emerald" && "bg-emerald/15 text-emerald",
                        color === "amber" && "bg-amber/15 text-amber",
                        color === "rose" && "bg-rose/15 text-rose",
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="font-semibold">{label}</div>
                      <div className="text-xs text-muted-foreground">{desc}</div>
                    </button>
                  );
                })}
              </div>
            </StepShell>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={back}
              disabled={step === 0}
              className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-4 py-2.5 text-sm font-medium transition hover:bg-secondary disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              type="button"
              onClick={next}
              disabled={saving}
              className="group flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
              style={{ background: "var(--gradient-aurora)", boxShadow: "var(--shadow-glow)" }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>{step === steps.length - 1 ? "Save & continue" : "Next"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepShell({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">{eyebrow}</p>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{title}</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">{subtitle}</p>
      {children}
    </div>
  );
}
