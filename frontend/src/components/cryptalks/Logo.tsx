// The Cryptalks wordmark + icon, used on auth pages and the dashboard header.
import { Sparkles } from "lucide-react";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dims = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const text = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-xl";
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`${dims} relative grid place-items-center rounded-xl shrink-0`}
        style={{ background: "var(--gradient-aurora)", boxShadow: "var(--shadow-glow)" }}
      >
        <Sparkles className="h-1/2 w-1/2 text-white" strokeWidth={2.5} />
      </div>
      <span className={`${text} font-bold tracking-tight`}>
        <span className="gradient-text">Crypt</span>
        <span>alks</span>
      </span>
    </div>
  );
}
