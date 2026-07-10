// Shared card shell (icon, title, eyebrow, accent glow) wrapping every
// dashboard section.
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  icon?: ReactNode;
  accent?: "violet" | "cyan" | "emerald" | "amber" | "rose";
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

const accentBg: Record<string, string> = {
  violet: "from-violet/25 to-transparent",
  cyan: "from-cyan/25 to-transparent",
  emerald: "from-emerald/25 to-transparent",
  amber: "from-amber/25 to-transparent",
  rose: "from-rose/25 to-transparent",
};
const iconBg: Record<string, string> = {
  violet: "bg-violet/15 text-violet",
  cyan: "bg-cyan/15 text-cyan",
  emerald: "bg-emerald/15 text-emerald",
  amber: "bg-amber/15 text-amber",
  rose: "bg-rose/15 text-rose",
};

export function SectionCard({ title, icon, accent = "violet", eyebrow, action, children, className }: Props) {
  return (
    <section
      className={cn(
        "glass group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:border-white/15",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-gradient-radial blur-3xl opacity-60 bg-gradient-to-br",
          accentBg[accent],
        )}
      />
      <header className="relative flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", iconBg[accent])}>
              {icon}
            </div>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {eyebrow}
              </p>
            )}
            <h2 className="text-lg font-semibold truncate">{title}</h2>
          </div>
        </div>
        {action}
      </header>
      <div className="relative">{children}</div>
    </section>
  );
}
