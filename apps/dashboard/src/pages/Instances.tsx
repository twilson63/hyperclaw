import { useQuery } from '@tanstack/react-query';
import { Plus, Server, Search, Filter } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { instancesApi } from '../lib/api';
import InstanceCard from '../components/InstanceCard';
import CreateInstanceModal from '../components/CreateInstanceModal';
import type { Instance } from '../types';

export default function Instances() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: instances, isLoading, error } = useQuery<Instance[]>({
    queryKey: ['instances'],
    queryFn: instancesApi.getAll,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Filter instances based on search and status
  const filteredInstances = instances?.filter(instance => {
    const matchesSearch = instance.name.toLowerCase().includes(search.toLowerCase()) ||
                          instance.model.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || instance.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateClick = () => {
    setShowCreateModal(true);
  };

  const handleInstanceClick = (instance: Instance) => {
    navigate(`/instances/${instance.id}`);
  };

  const statusCounts = instances?.reduce((acc, instance) => {
    acc[instance.status] = (acc[instance.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-['Space_Grotesk']">Instances</h1>
          <p className="mt-1 text-gray-400 font-['IBM_Plex_Mono']">
            Manage your HyperClaw instances
          </p>
        </div>
        <button
          onClick={handleCreateClick}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-black font-semibold transition-all hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] font-['IBM_Plex_Mono'] text-sm"
        >
          <Plus className="h-4 w-4" />
          Create Instance
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search instances..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#16161f] py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 font-['IBM_Plex_Mono'] text-sm"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#16161f] px-3 py-2 text-white focus:border-cyan-500/50 focus:outline-none font-['IBM_Plex_Mono'] text-sm"
          >
            <option value="all">All Status</option>
            <option value="running">Running ({statusCounts['running'] || 0})</option>
            <option value="stopped">Stopped ({statusCounts['stopped'] || 0})</option>
            <option value="pending">Pending ({statusCounts['pending'] || 0})</option>
            <option value="error">Error ({statusCounts['error'] || 0})</option>
          </select>
        </div>
      </div>

      {/* Instance Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl bg-white/5"
            />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 p-8">
          <p className="text-red-400 font-['IBM_Plex_Mono']">Failed to load instances</p>
          <p className="mt-2 text-sm text-gray-500">Please try again later</p>
        </div>
      ) : filteredInstances && filteredInstances.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredInstances.map((instance, index) => (
            <div
              key={instance.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <InstanceCard
                instance={instance}
                onClick={() => handleInstanceClick(instance)}
              />
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/5 bg-[#16161f] p-12">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
            <Server className="h-8 w-8 text-gray-500" />
          </div>
          <p className="text-lg font-medium text-white font-['Space_Grotesk']">
            {search || statusFilter !== 'all' ? 'No instances match your filters' : 'No instances yet'}
          </p>
          <p className="mt-1 text-gray-400 font-['IBM_Plex_Mono']">
            {search || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first instance to get started'}
          </p>
          {!search && statusFilter === 'all' && (
            <button
              onClick={handleCreateClick}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-500/10 px-4 py-2 text-cyan-400 transition-all hover:bg-cyan-500/20 font-['IBM_Plex_Mono'] text-sm"
            >
              <Plus className="h-4 w-4" />
              Create Instance
            </button>
          )}
        </div>
      )}

      {/* Create Instance Modal */}
      <CreateInstanceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}