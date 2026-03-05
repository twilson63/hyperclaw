import { useQuery } from '@tanstack/react-query';
import { Server, Activity, HardDrive, DollarSign } from 'lucide-react';
import { useEffect, useState } from 'react';
import { statsApi } from '../lib/api';

interface Stats {
  totalInstances: number;
  runningInstances: number;
  ramUsage: number;
  estimatedCost: number;
}

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  suffix?: string;
  prefix?: string;
}

function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(value * easeOut));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <>{displayValue}</>;
}

function StatsCard({ title, value, icon, suffix = '', prefix = '' }: StatsCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-gradient-to-br from-[#16161f] to-[#1a1a25] p-6 transition-all duration-300 hover:border-cyan-500/20 hover:shadow-[0_0_30px_rgba(0,229,255,0.1)]">
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      
      {/* Icon */}
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 transition-all duration-300 group-hover:bg-cyan-500/20 group-hover:text-cyan-300">
        {icon}
      </div>
      
      {/* Title */}
      <p className="mb-1 text-sm text-gray-400 font-['IBM_Plex_Mono']">{title}</p>
      
      {/* Value */}
      <div className="flex items-baseline gap-1">
        {prefix && <span className="text-lg text-gray-400 font-['IBM_Plex_Mono']">{prefix}</span>}
        <span className="text-3xl font-bold text-white font-['Space_Grotesk'] tracking-tight">
          <AnimatedCounter value={value} />
        </span>
        {suffix && <span className="text-lg text-gray-400 font-['IBM_Plex_Mono']">{suffix}</span>}
      </div>
      
      {/* Subtle grid pattern */}
      <div className="absolute -right-4 -top-4 h-24 w-24 opacity-5" style={{
        backgroundImage: 'linear-gradient(cyan 1px, transparent 1px), linear-gradient(90deg, cyan 1px, transparent 1px)',
        backgroundSize: '8px 8px'
      }} />
    </div>
  );
}

export default function Overview() {
  const { data: apiStats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: statsApi.getStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Transform API stats to local stats format
  const stats: Stats = {
    totalInstances: apiStats?.totalInstances ?? 0,
    runningInstances: apiStats?.activeInstances ?? 0,
    ramUsage: apiStats?.ramUsage ?? 0,
    estimatedCost: apiStats?.monthlyCost ?? 0,
  };

  const cards = [
    {
      title: 'Total Instances',
      value: stats.totalInstances,
      icon: <Server className="h-6 w-6" />,
    },
    {
      title: 'Running Instances',
      value: stats.runningInstances,
      icon: <Activity className="h-6 w-6" />,
    },
    {
      title: 'RAM Usage',
      value: stats.ramUsage,
      suffix: 'GB',
      icon: <HardDrive className="h-6 w-6" />,
    },
    {
      title: 'Estimated Cost',
      value: stats.estimatedCost,
      prefix: '$',
      icon: <DollarSign className="h-6 w-6" />,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white font-['Space_Grotesk']">Overview</h1>
        <p className="mt-1 text-gray-400 font-['IBM_Plex_Mono']">
          Monitor your HyperClaw instances at a glance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 4 }).map((_, i) => (
            <div 
              key={i}
              className="h-40 animate-pulse rounded-xl bg-white/5"
            />
          ))
        ) : (
          cards.map((card, index) => (
            <div
              key={card.title}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <StatsCard {...card} />
            </div>
          ))
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-white/5 bg-[#16161f] p-6">
        <h2 className="mb-4 text-lg font-semibold text-white font-['Space_Grotesk']">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <button className="rounded-lg bg-cyan-500/10 px-4 py-2 text-cyan-400 transition-all hover:bg-cyan-500/20 hover:text-cyan-300 font-['IBM_Plex_Mono'] text-sm">
            Create New Instance
          </button>
          <button className="rounded-lg bg-white/5 px-4 py-2 text-gray-400 transition-all hover:bg-white/10 hover:text-white font-['IBM_Plex_Mono'] text-sm">
            View All Instances
          </button>
          <button className="rounded-lg bg-white/5 px-4 py-2 text-gray-400 transition-all hover:bg-white/10 hover:text-white font-['IBM_Plex_Mono'] text-sm">
            View Logs
          </button>
        </div>
      </div>
    </div>
  );
}