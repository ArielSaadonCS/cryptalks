import { ReactNode } from "react";

interface DashboardCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export default function DashboardCard({ title, children, className }: DashboardCardProps) {
  return (
    <section className={`dashboard-section-card${className ? ` ${className}` : ""}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
