import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Play, Square, Trash2, Clock, Cpu, HardDrive, DollarSign, Terminal } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { instancesApi } from '../lib/api';
import type { Instance, InstanceStatus } from '../types';

// Status badge component with glow effects
function StatusBadge({ status }: { status: InstanceStatus }) {
  const statusConfig: Record<InstanceStatus, { color: string; bgColor: string; glow: string; label: string }> = {
    running: {
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      glow: 'shadow-[0_0_12px_rgba(0,229,255,0.5)]',
      label: 'Running',
    },
    stopped: {
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/10',
      glow: '',
      label: 'Stopped',
    },
    pending: {
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      glow: 'animate-pulse',
      label: 'Pending',
    },
    error: {
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      glow: '',
      label: 'Error',
    },
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${config.bgColor} ${config.color} ${config.glow} font-['IBM_Plex_Mono'] text-sm`}>
      <span className={`h-2 w-2 rounded-full ${status === 'running' ? 'bg-cyan-400 shadow-[0_0_8px_rgba(0,229,255,0.8)]' : status === 'pending' ? 'bg-yellow-400' : status === 'error' ? 'bg-red-400' : 'bg-gray-400'}`} />
      {config.label}
    </span>
  );
}

// Calculate uptime from createdAt
function calculateUptime(createdAt: string): string {
  const start = new Date(createdAt).getTime();
  const now = Date.now();
  const diffMs = now - start;
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h`;
}

// Calculate estimated cost (mock calculation)
function calculateCost(ram: number, createdAt: string): number {
  const hours = parseInt(calculateUptime(createdAt));
  const hourRate = ram * 0.05; // $0.05 per GB per hour
  return hours * hourRate;
}

export default function InstanceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: instance, isLoading, error } = useQuery<Instance>({
    queryKey: ['instance', id],
    queryFn: () => instancesApi.getById(id!),
    enabled: !!id,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const startMutation = useMutation({
    mutationFn: () => instancesApi.start(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instance', id] });
      queryClient.invalidateQueries({ queryKey: ['instances'] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => instancesApi.stop(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instance', id] });
      queryClient.invalidateQueries({ queryKey: ['instances'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => instancesApi.delete(id!),
    onSuccess: () => {
      navigate('/instances');
    },
  });

  const handleBack = () => {
    navigate('/instances');
  };

  const handleStartStop = () => {
    if (instance?.status === 'running') {
      stopMutation.mutate();
    } else {
      startMutation.mutate();
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this instance? This action cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-white/5" />
        <div className="h-32 animate-pulse rounded-xl bg-white/5" />
        <div className="h-64 animate-pulse rounded-xl bg-white/5" />
      </div>
    );
  }

  if (error || !instance) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 p-8">
        <p className="text-red-400 font-['IBM_Plex_Mono']">Failed to load instance</p>
        <button
          onClick={handleBack}
          className="mt-4 text-cyan-400 hover:text-cyan-300 font-['IBM_Plex_Mono']"
        >
          ← Back to instances
        </button>
      </div>
    );
  }

  const isRunning = instance.status === 'running';
  const uptime = calculateUptime(instance.createdAt);
  const cost = calculateCost(instance.ramGb, instance.createdAt);
  const isPending = instance.status === 'pending';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-gray-400 transition-all hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white font-['Space_Grotesk']">
                {instance.name}
              </h1>
              <StatusBadge status={instance.status} />
            </div>
            <p className="mt-1 font-mono text-sm text-gray-500">{instance.id}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleStartStop}
            disabled={isPending || startMutation.isPending || stopMutation.isPending}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-all font-['IBM_Plex_Mono'] text-sm disabled:opacity-50 ${
              isRunning
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
            }`}
          >
            {isRunning ? (
              <>
                <Square className="h-4 w-4" />
                Stop
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start
              </>
            )}
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending || deleteMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50 font-['IBM_Plex_Mono'] text-sm"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/5 bg-[#16161f] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
              <Cpu className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-['IBM_Plex_Mono']">Model</p>
              <p className="text-lg font-semibold text-white font-['Space_Grotesk']">{instance.model}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-[#16161f] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
              <HardDrive className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-['IBM_Plex_Mono']">RAM</p>
              <p className="text-lg font-semibold text-white font-['Space_Grotesk']">{instance.ramGb} GB</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-[#16161f] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
              <Clock className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-['IBM_Plex_Mono']">Uptime</p>
              <p className="text-lg font-semibold text-white font-['Space_Grotesk']">{uptime}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-[#16161f] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
              <DollarSign className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-['IBM_Plex_Mono']">Cost</p>
              <p className="text-lg font-semibold text-white font-['Space_Grotesk']">${cost.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Preview */}
      <div className="rounded-xl border border-white/5 bg-[#16161f] p-6">
        <div className="mb-4 flex items-center gap-2">
          <Terminal className="h-5 w-5 text-cyan-400" />
          <h2 className="text-lg font-semibold text-white font-['Space_Grotesk']">Terminal</h2>
          {isRunning && (
            <span className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400 font-['IBM_Plex_Mono']">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Connected
            </span>
          )}
        </div>
        
        {/* Terminal Placeholder */}
        <div className="min-h-[300px] rounded-lg border border-white/10 bg-[#0a0a0f] p-4 font-mono text-sm">
          {isRunning ? (
            <div className="space-y-2">
              <div className="text-gray-500">
                <span className="text-cyan-400">hyperclaw@{instance.id.slice(0, 8)}</span>:~$
              </div>
              <div className="text-gray-400">
                WebSocket terminal connection placeholder.
                <br />
                <span className="text-gray-600">
                  Terminal component will render here with live session.
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-cyan-400">hyperclaw@{instance.id.slice(0, 8)}</span>:~$
                <span className="ml-1 h-4 w-2 animate-pulse bg-cyan-400" />
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-gray-500">
              Start the instance to connect to the terminal
            </div>
          )}
        </div>
      </div>

      {/* Instance Details */}
      <div className="rounded-xl border border-white/5 bg-[#16161f] p-6">
        <h2 className="mb-4 text-lg font-semibold text-white font-['Space_Grotesk']">Instance Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-gray-500 font-['IBM_Plex_Mono']">Created</p>
            <p className="mt-1 text-white font-['IBM_Plex_Mono']">
              {new Date(instance.createdAt).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-['IBM_Plex_Mono']">Expires</p>
            <p className="mt-1 text-white font-['IBM_Plex_Mono']">
              {new Date(instance.expiresAt).toLocaleString()}
            </p>
          </div>
          {instance.endpoint && (
            <div>
              <p className="text-xs text-gray-500 font-['IBM_Plex_Mono']">Endpoint</p>
              <p className="mt-1 text-white font-mono text-sm truncate">{instance.endpoint}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}