import type { ReactNode } from 'react';

interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
}

export function StatsCard({ icon, label, value, sublabel }: StatsCardProps) {
  return (
    <div className="bg-bg-card border border-border rounded-lg p-4 hover:border-border-accent transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="text-cyan-500">
            {icon}
          </div>
          <div>
            <p className="text-text-muted text-xs uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
            {sublabel && (
              <p className="text-text-secondary text-sm mt-0.5">{sublabel}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}