import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { instancesApi } from '../lib/api';

// Validation schema
const validateForm = (data: { name: string; model: string; ram: string; ttl: string }) => {
  const errors: Record<string, string> = {};
  
  if (!data.name) {
    errors.name = 'Name is required';
  } else if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(data.name)) {
    errors.name = 'Name must be lowercase alphanumeric with hyphens';
  }
  
  if (!data.model) errors.model = 'Model is required';
  if (!data.ram) errors.ram = 'RAM is required';
  if (!data.ttl) errors.ttl = 'TTL is required';
  
  return errors;
};

interface CreateInstanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MODEL_MAP: Record<string, string> = {
  'Qwen 3.5': 'qwen3.5',
  'Qwen 2.5': 'qwen2.5',
  'Llama 3.2': 'llama3',
};

export function CreateInstanceModal({ isOpen, onClose }: CreateInstanceModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    ram: '',
    ttl: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isVisible, setIsVisible] = useState(false);

  // Handle animation timing
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({ name: '', model: '', ram: '', ttl: '' });
      setErrors({});
    }
  }, [isOpen]);

  const createMutation = useMutation({
    mutationFn: () => {
      const ttlHours = parseInt(formData.ttl, 10);
      const ttlSeconds = ttlHours * 3600;
      return instancesApi.create({
        name: formData.name,
        model: MODEL_MAP[formData.model] || 'qwen3.5',
        ram: parseInt(formData.ram, 10),
        ttl: ttlSeconds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instances'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      onClose();
    },
    onError: (error: Error) => {
      setErrors({ submit: error.message });
    },
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    createMutation.mutate();
  };

  const handleClose = () => {
    if (!createMutation.isPending) {
      onClose();
    }
  };

  if (!isVisible && !isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal */}
      <div 
        className={`relative w-full max-w-md overflow-hidden rounded-xl border border-[var(--color-border-accent)] shadow-2xl transition-all duration-200 ${
          isOpen ? 'translate-y-0 scale-100' : 'translate-y-4 scale-95'
        }`}
        style={{
          background: 'rgba(16, 16, 31, 0.95)',
          backdropFilter: 'blur(12px)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <h2 
            className="text-xl font-semibold"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Create New Instance
          </h2>
          <button
            onClick={handleClose}
            disabled={createMutation.isPending}
            className="rounded-lg p-2 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Name Field */}
          <div className="mb-5">
            <label 
              htmlFor="name" 
              className="mb-2 block text-sm text-[var(--color-text-secondary)]"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              Name <span className="text-cyan-400">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={e => handleChange('name', e.target.value)}
              placeholder="my-instance"
              disabled={createMutation.isPending}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[#12121a] px-4 py-3 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition-all duration-200 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 disabled:opacity-50"
              style={{ fontFamily: 'var(--font-ui)' }}
            />
            {errors.name && (
              <p className="mt-1.5 text-sm text-red-400" style={{ fontFamily: 'var(--font-ui)' }}>
                {errors.name}
              </p>
            )}
          </div>

          {/* Model Field */}
          <div className="mb-5">
            <label 
              htmlFor="model" 
              className="mb-2 block text-sm text-[var(--color-text-secondary)]"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              Model <span className="text-cyan-400">*</span>
            </label>
            <div className="relative">
              <select
                id="model"
                value={formData.model}
                onChange={e => handleChange('model', e.target.value)}
                disabled={createMutation.isPending}
                className="w-full cursor-pointer appearance-none rounded-lg border border-[var(--color-border)] bg-[#12121a] px-4 py-3 pr-10 text-[var(--color-text-primary)] transition-all duration-200 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'var(--font-ui)' }}
              >
                <option value="" disabled className="bg-[#12121a] text-[var(--color-text-muted)]">
                  Select model...
                </option>
                <option value="Qwen 3.5" className="bg-[#12121a]">Qwen 3.5</option>
                <option value="Qwen 2.5" className="bg-[#12121a]">Qwen 2.5</option>
                <option value="Llama 3.2" className="bg-[#12121a]">Llama 3.2</option>
              </select>
              {/* Custom dropdown arrow */}
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className="h-5 w-5 text-[var(--color-text-muted)]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            {errors.model && (
              <p className="mt-1.5 text-sm text-red-400" style={{ fontFamily: 'var(--font-ui)' }}>
                {errors.model}
              </p>
            )}
          </div>

          {/* RAM Field */}
          <div className="mb-5">
            <label 
              htmlFor="ram" 
              className="mb-2 block text-sm text-[var(--color-text-secondary)]"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              RAM <span className="text-cyan-400">*</span>
            </label>
            <div className="relative">
              <select
                id="ram"
                value={formData.ram}
                onChange={e => handleChange('ram', e.target.value)}
                disabled={createMutation.isPending}
                className="w-full cursor-pointer appearance-none rounded-lg border border-[var(--color-border)] bg-[#12121a] px-4 py-3 pr-10 text-[var(--color-text-primary)] transition-all duration-200 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'var(--font-ui)' }}
              >
                <option value="" disabled className="bg-[#12121a] text-[var(--color-text-muted)]">
                  Select RAM...
                </option>
                <option value="16" className="bg-[#12121a]">16 GB</option>
                <option value="32" className="bg-[#12121a]">32 GB</option>
                <option value="64" className="bg-[#12121a]">64 GB</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className="h-5 w-5 text-[var(--color-text-muted)]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            {errors.ram && (
              <p className="mt-1.5 text-sm text-red-400" style={{ fontFamily: 'var(--font-ui)' }}>
                {errors.ram}
              </p>
            )}
          </div>

          {/* TTL Field */}
          <div className="mb-6">
            <label 
              htmlFor="ttl" 
              className="mb-2 block text-sm text-[var(--color-text-secondary)]"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              Time to Live <span className="text-cyan-400">*</span>
            </label>
            <div className="relative">
              <select
                id="ttl"
                value={formData.ttl}
                onChange={e => handleChange('ttl', e.target.value)}
                disabled={createMutation.isPending}
                className="w-full cursor-pointer appearance-none rounded-lg border border-[var(--color-border)] bg-[#12121a] px-4 py-3 pr-10 text-[var(--color-text-primary)] transition-all duration-200 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'var(--font-ui)' }}
              >
                <option value="" disabled className="bg-[#12121a] text-[var(--color-text-muted)]">
                  Select TTL...
                </option>
                <option value="1" className="bg-[#12121a]">1 hour</option>
                <option value="6" className="bg-[#12121a]">6 hours</option>
                <option value="24" className="bg-[#12121a]">24 hours</option>
                <option value="168" className="bg-[#12121a]">7 days</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className="h-5 w-5 text-[var(--color-text-muted)]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            {errors.ttl && (
              <p className="mt-1.5 text-sm text-red-400" style={{ fontFamily: 'var(--font-ui)' }}>
                {errors.ttl}
              </p>
            )}
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <p className="text-sm text-red-400" style={{ fontFamily: 'var(--font-ui)' }}>
                {errors.submit}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={createMutation.isPending}
              className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 rounded-lg bg-cyan-500 px-4 py-3 font-medium text-black transition-all duration-200 hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] disabled:opacity-50 disabled:hover:shadow-none"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              {createMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </span>
              ) : (
                'Create Instance'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateInstanceModal;