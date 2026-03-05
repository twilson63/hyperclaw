import { Server, Activity } from 'lucide-react';
import type { Instance, InstanceStatus } from '../types';

interface InstanceCardProps {
  instance: Instance;
  onClick?: () => void;
}

// Status badge colors and glow effects
const statusStyles: Record<InstanceStatus, {
  textColor: string;
  bgColor: string;
  dotColor: string;
  glow: string;
  label: string;
}> = {
  running: {
    textColor: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10 border-cyan-500/20',
    dotColor: 'bg-cyan-400',
    glow: 'shadow-[0_0_12px_rgba(0,229,255,0.3)] hover:shadow-[0_0_20px_rgba(0,229,255,0.5)]',
    label: 'Running',
  },
  stopped: {
    textColor: 'text-gray-400',
    bgColor: 'bg-gray-500/10 border-gray-500/20',
    dotColor: 'bg-gray-400',
    glow: '',
    label: 'Stopped',
  },
  pending: {
    textColor: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10 border-yellow-500/20',
    dotColor: 'bg-yellow-400',
    glow: 'animate-pulse',
    label: 'Pending',
  },
  error: {
    textColor: 'text-red-400',
    bgColor: 'bg-red-500/10 border-red-500/20',
    dotColor: 'bg-red-400',
    glow: '',
    label: 'Error',
  },
};

export default function InstanceCard({ instance, onClick }: InstanceCardProps) {
  const status = statusStyles[instance.status];
  const isRunning = instance.status === 'running';

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border bg-gradient-to-br from-[#16161f] to-[#1a1a25] p-5 transition-all duration-300 cursor-pointer
        ${isRunning 
          ? 'border-cyan-500/20 hover:border-cyan-500/40 hover:shadow-[0_0_30px_rgba(0,229,255,0.15)]' 
          : 'border-white/5 hover:border-white/10 hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
        }
        transform hover:-translate-y-1
      `}
    >
      {/* Glow overlay for running instances */}
      {isRunning && (
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      )}
      
      {/* Top row: Status + Activity indicator */}
      <div className="mb-4 flex items-center justify-between">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.bgColor} ${status.textColor}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${status.dotColor} ${isRunning ? 'shadow-[0_0_6px_rgba(0,229,255,0.8)]' : ''}`} />
          {status.label}
        </span>
        
        {isRunning && (
          <Activity className="h-4 w-4 text-cyan-400 animate-pulse" />
        )}
      </div>
      
      {/* Instance name */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white font-['Space_Grotesk'] group-hover:text-cyan-300 transition-colors">
          {instance.name}
        </h3>
        <p className="mt-0.5 font-mono text-xs text-gray-500">
          {instance.id}
        </p>
      </div>
      
      {/* Details row */}
      <div className="flex items-center gap-4 text-sm">
        {/* Model */}
        <div className="flex items-center gap-1.5">
          <Server className="h-4 w-4 text-gray-500" />
          <span className="font-mono text-gray-300">{instance.model}</span>
        </div>
        
        {/* RAM */}
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500">RAM:</span>
          <span className="font-mono text-gray-300">{instance.ramGb}GB</span>
        </div>
      </div>
      
      {/* Hover indicator */}
      <div className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-gray-500 opacity-0 transition-all group-hover:opacity-100 group-hover:bg-cyan-500/10 group-hover:text-cyan-400">
        <svg 
          className="h-4 w-4 transform transition-transform group-hover:translate-x-0.5" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
      
      {/* Subtle decorative grid */}
      <div 
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 opacity-[0.03] transition-opacity group-hover:opacity-[0.06]"
        style={{
          backgroundImage: 'linear-gradient(cyan 1px, transparent 1px), linear-gradient(90deg, cyan 1px, transparent 1px)',
          backgroundSize: '12px 12px',
        }}
      />
    </div>
  );
}