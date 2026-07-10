// Historical price line chart for one coin/period, with loading and
// "unavailable" states.
import { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getCoinHistory, HistoryPeriod, PriceHistoryPoint } from "@/lib/api";
import { Loader2 } from "lucide-react";

function formatTick(timestamp: number, period: HistoryPeriod): string {
  const date = new Date(timestamp);
  if (period === "1D") return date.toLocaleTimeString("en-US", { hour: "numeric" });
  if (period === "1W" || period === "1M") return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatPrice(value: number): string {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: value < 1 ? 4 : 0 })}`;
}

export function CoinChart({ symbol, period, positive }: { symbol: string; period: HistoryPeriod; positive: boolean }) {
  const [points, setPoints] = useState<PriceHistoryPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    getCoinHistory(symbol, period)
      .then((data) => {
        if (cancelled) return;
        if (data.points.length === 0) {
          setFailed(true);
          setPoints(null);
        } else {
          setPoints(data.points);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, period]);

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (failed || !points) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-1 text-center text-xs text-muted-foreground">
        <span>Chart unavailable for {period}</span>
        {period === "5Y" && <span className="text-[10px] opacity-70">(requires a paid CoinGecko plan)</span>}
      </div>
    );
  }

  const color = positive ? "var(--emerald)" : "var(--rose)";
  const data = points.map((p) => ({ t: p.timestamp, price: p.price }));

  return (
    <ResponsiveContainer width="100%" height={128}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="t"
          tickFormatter={(t) => formatTick(t, period)}
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          minTickGap={30}
        />
        <YAxis
          domain={["auto", "auto"]}
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          width={56}
          tickFormatter={formatPrice}
        />
        <Tooltip
          contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
          labelFormatter={(t) => new Date(t as number).toLocaleString("en-US")}
          formatter={(value) => [formatPrice(Number(value)), "Price"]}
        />
        <Line type="monotone" dataKey="price" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
