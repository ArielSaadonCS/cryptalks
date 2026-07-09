import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ApiError, clearToken, DashboardData, getDashboardToday, getMe, getMyFeedback,
  getPreferences, getToken, Preferences, SectionType, submitFeedback, Vote,
} from "@/lib/api";
import { Logo } from "@/components/cryptalks/Logo";
import { SectionCard } from "@/components/cryptalks/SectionCard";
import { FeedbackButtons } from "@/components/cryptalks/FeedbackButtons";
import { cn } from "@/lib/utils";
import {
  AlertCircle, Brain, ExternalLink, ImageOff, LineChart, LogOut, Newspaper,
  Radio, Loader2, Smile, Sparkles, TrendingDown, TrendingUp, User as UserIcon,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function feedbackKey(s: SectionType, id: string) { return `${s}:${id}`; }

function DashboardPage() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>("");
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [memeFailed, setMemeFailed] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, Vote>>({});
  const [feedbackSubmitting, setFeedbackSubmitting] = useState<Record<string, boolean>>({});
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) { navigate({ to: "/login", replace: true }); return; }
    let cancelled = false;
    Promise.all([getMe(), getPreferences(), getDashboardToday(), getMyFeedback()])
      .then(([me, prefs, data, fb]) => {
        if (cancelled) return;
        if (!me.onboardingCompleted) { navigate({ to: "/onboarding", replace: true }); return; }
        setUserName(me.name);
        setPreferences(prefs);
        setDashboard(data);
        const map: Record<string, Vote> = {};
        for (const item of fb) map[feedbackKey(item.sectionType, item.itemId)] = item.vote;
        setFeedback(map);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) { navigate({ to: "/login", replace: true }); return; }
        if (err instanceof ApiError && err.status === 403) { navigate({ to: "/onboarding", replace: true }); return; }
        setError(err instanceof ApiError ? err.message : "Could not load your dashboard.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [navigate]);

  async function handleVote(sectionType: SectionType, itemId: string, vote: Vote) {
    const key = feedbackKey(sectionType, itemId);
    setFeedbackError(null);
    setFeedbackSubmitting((p) => ({ ...p, [key]: true }));
    try {
      await submitFeedback({ sectionType, itemId, vote });
      setFeedback((p) => ({ ...p, [key]: vote }));
    } catch (err) {
      setFeedbackError(err instanceof ApiError ? err.message : "Could not save your feedback.");
    } finally {
      setFeedbackSubmitting((p) => ({ ...p, [key]: false }));
    }
  }

  function handleLogout() {
    clearToken();
    navigate({ to: "/login", replace: true });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Assembling your briefing…</p>
        </div>
      </div>
    );
  }

  if (error || !preferences || !dashboard) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="glass max-w-md rounded-2xl p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <p className="mt-3 text-sm">{error ?? "Could not load your dashboard."}</p>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        {/* Header */}
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <Logo />
          <button
            onClick={handleLogout}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-2 text-xs font-medium transition hover:bg-secondary sm:px-4 sm:text-sm"
          >
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Log out</span>
          </button>
        </header>

        {/* Hero */}
        <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="glass relative overflow-hidden rounded-3xl p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-40 blur-3xl"
              style={{ background: "var(--gradient-aurora)" }} />
            <div className="relative">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                {today}
              </p>
              <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
                Good day, <span className="gradient-text">{userName || "trader"}</span>
              </h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Here&apos;s your personalized crypto briefing — AI-curated insights, news signals,
                and a little fun. Not financial advice, just context.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Chip icon={<UserIcon className="h-3 w-3" />}>{preferences.investorType}</Chip>
                <Chip icon={<Radio className="h-3 w-3" />}>{preferences.riskLevel} risk</Chip>
                {preferences.assets.slice(0, 4).map((a) => (
                  <Chip key={a} mono>{a}</Chip>
                ))}
                {preferences.assets.length > 4 && (
                  <Chip>+{preferences.assets.length - 4} more</Chip>
                )}
              </div>
            </div>
          </div>

          {/* AI Insight */}
          <div
            className="relative overflow-hidden rounded-3xl p-6 sm:p-8"
            style={{ background: "var(--gradient-aurora)", boxShadow: "var(--shadow-glow)" }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
            <div className="relative">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/20 backdrop-blur">
                  <Brain className="h-4 w-4 text-white" />
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/80">
                  AI Insight of the Day
                </p>
                <span className={cn(
                  "ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                  dashboard.aiInsight.isFallback ? "bg-white/15 text-white/80" : "bg-white/25 text-white",
                )}>
                  {dashboard.aiInsight.isFallback ? "Fallback" : "Live AI"}
                </span>
              </div>
              <h2 className="mt-4 text-xl font-bold text-white sm:text-2xl">
                {dashboard.aiInsight.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/90">
                {dashboard.aiInsight.content}
              </p>
              <div className="mt-4">
                <FeedbackButtons
                  sectionType="AI_INSIGHT"
                  itemId={dashboard.aiInsight.id}
                  prompt="Was this insight useful?"
                  vote={feedback[feedbackKey("AI_INSIGHT", dashboard.aiInsight.id)] ?? null}
                  submitting={!!feedbackSubmitting[feedbackKey("AI_INSIGHT", dashboard.aiInsight.id)]}
                  onVote={handleVote}
                />
              </div>
            </div>
          </div>
        </section>

        {feedbackError && (
          <div className="mt-6 flex gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />{feedbackError}
          </div>
        )}

        {/* Grid */}
        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Market news — spans 2 cols */}
          <SectionCard
            title="Personalized News"
            eyebrow="Curated for you"
            icon={<Newspaper className="h-5 w-5" />}
            accent="cyan"
            className="lg:col-span-2"
          >
            {dashboard.marketNews.length === 0 ? (
              <EmptyState label="No news right now." />
            ) : (
              <ul className="space-y-3">
                {dashboard.marketNews.map((item) => {
                  const key = feedbackKey("MARKET_NEWS", item.id);
                  return (
                    <li
                      key={item.id}
                      className="group rounded-xl border border-border/60 bg-secondary/30 p-4 transition-all hover:border-cyan/40 hover:bg-secondary/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold leading-snug">
                          {item.url ? (
                            <a href={item.url} target="_blank" rel="noopener noreferrer"
                              className="hover:text-cyan inline-flex items-start gap-1.5">
                              {item.title}
                              <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" />
                            </a>
                          ) : item.title}
                        </h3>
                        <span className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                          item.isFallback
                            ? "bg-amber/15 text-amber"
                            : "bg-emerald/15 text-emerald",
                        )}>
                          {item.isFallback ? "Fallback" : "Live"}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-muted-foreground line-clamp-3">{item.summary}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {item.source}
                        </span>
                        {item.relatedAssets.length > 0 && <span className="text-muted-foreground/60">·</span>}
                        {item.relatedAssets.map((a) => (
                          <span key={a} className="rounded-md bg-cyan/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-cyan">
                            {a}
                          </span>
                        ))}
                      </div>
                      <FeedbackButtons
                        sectionType="MARKET_NEWS"
                        itemId={item.id}
                        prompt="Useful?"
                        vote={feedback[key] ?? null}
                        submitting={!!feedbackSubmitting[key]}
                        onVote={handleVote}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          {/* Coin prices */}
          <SectionCard
            title="Market Signals"
            eyebrow="24h movement"
            icon={<LineChart className="h-5 w-5" />}
            accent="emerald"
          >
            {dashboard.coinPrices.length === 0 ? (
              <EmptyState label="No price data right now." />
            ) : (
              <ul className="space-y-2">
                {dashboard.coinPrices.map((coin) => {
                  const key = feedbackKey("COIN_PRICE", coin.id);
                  const positive = coin.change24h >= 0;
                  return (
                    <li
                      key={coin.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/60 bg-secondary/30 p-3 transition hover:border-white/15"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold">{coin.symbol}</span>
                          <span className="truncate text-xs text-muted-foreground">{coin.name}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="font-mono text-sm">
                            ${coin.priceUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                          <span className={cn(
                            "inline-flex items-center gap-0.5 font-mono text-xs font-semibold",
                            positive ? "text-emerald" : "text-rose",
                          )}>
                            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {positive ? "+" : ""}{coin.change24h.toFixed(1)}%
                          </span>
                        </div>
                        <span className={cn(
                          "mt-1 inline-block font-mono text-[9px] uppercase tracking-wider",
                          coin.source === "live" ? "text-emerald/80" : "text-amber/80",
                        )}>
                          {coin.source === "live" ? "Live" : coin.source === "cache" ? "Cached" : "Static"}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <FeedbackButtons
                          sectionType="COIN_PRICE"
                          itemId={coin.id}
                          vote={feedback[key] ?? null}
                          submitting={!!feedbackSubmitting[key]}
                          onVote={handleVote}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          {/* Meme */}
          <SectionCard
            title="Crypto Meme"
            eyebrow="Because ser, we deserve"
            icon={<Smile className="h-5 w-5" />}
            accent="amber"
            className="lg:col-span-2"
          >
            <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
              <div className="relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-secondary/50">
                {memeFailed ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                    <ImageOff className="h-6 w-6" />
                    <span className="text-xs">Image unavailable</span>
                  </div>
                ) : (
                  <img
                    src={dashboard.meme.imageUrl}
                    alt={dashboard.meme.title}
                    onError={() => setMemeFailed(true)}
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                )}
              </div>
              <div className="flex flex-col">
                <h3 className="text-lg font-semibold">{dashboard.meme.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{dashboard.meme.caption}</p>
                <span className="mt-3 inline-block w-fit rounded-full bg-amber/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber">
                  Static meme
                </span>
                <div className="mt-auto">
                  <FeedbackButtons
                    sectionType="MEME"
                    itemId={dashboard.meme.id}
                    prompt="Did this match your mood?"
                    vote={feedback[feedbackKey("MEME", dashboard.meme.id)] ?? null}
                    submitting={!!feedbackSubmitting[feedbackKey("MEME", dashboard.meme.id)]}
                    onVote={handleVote}
                  />
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Your interests */}
          <SectionCard
            title="Your Interests"
            eyebrow="Personalization"
            icon={<Sparkles className="h-5 w-5" />}
            accent="violet"
          >
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Assets</dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">
                  {preferences.assets.map((a) => (
                    <span key={a} className="rounded-md border border-violet/30 bg-violet/10 px-2 py-0.5 font-mono text-xs font-semibold text-violet">
                      {a}
                    </span>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Investor type</dt>
                <dd className="mt-1">{preferences.investorType}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Content</dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">
                  {preferences.contentTypes.map((c) => (
                    <span key={c} className="rounded-md bg-secondary px-2 py-0.5 text-xs">{c}</span>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Risk level</dt>
                <dd className="mt-1">{preferences.riskLevel}</dd>
              </div>
            </dl>
          </SectionCard>
        </section>

        <p className="mt-10 max-w-3xl text-center text-xs text-muted-foreground mx-auto">
          Cryptalks provides market context and educational summaries only. It does not provide
          financial advice or trading recommendations. Your feedback helps us learn what&apos;s
          useful — it doesn&apos;t change your onboarding preferences.
        </p>
      </div>
    </div>
  );
}

function Chip({ children, icon, mono }: { children: React.ReactNode; icon?: React.ReactNode; mono?: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-xs",
      mono && "font-mono font-semibold",
    )}>
      {icon}{children}
    </span>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}
