/**
 * Login Page - HyperClaw Dashboard Authentication
 * Dark terminal aesthetic with glass card effect
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Zap } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-primary">
      {/* Background grid pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(0,229,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* Ambient glow */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
            <Zap className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-display font-bold text-text-primary">
            HyperClaw
          </h1>
        </div>

        {/* Glass Card */}
        <div className="glass rounded-2xl p-8 shadow-elevated border border-border">
          <div className="mb-8">
            <h2 className="text-xl font-display font-semibold text-text-primary mb-2">
              Welcome back
            </h2>
            <p className="text-text-secondary text-sm">
              Sign in to your account to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-lg 
                         text-text-primary placeholder:text-text-muted 
                         focus:outline-none focus:border-accent focus:shadow-[0_0_0_2px_rgba(0,229,255,0.1)]
                         transition-all duration-200 font-ui"
              />
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full px-4 py-3 pr-12 bg-bg-secondary border border-border rounded-lg 
                           text-text-primary placeholder:text-text-muted 
                           focus:outline-none focus:border-accent focus:shadow-[0_0_0_2px_rgba(0,229,255,0.1)]
                           transition-all duration-200 font-ui"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted 
                           hover:text-text-secondary transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* API Error */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400 font-mono">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-accent text-bg-primary font-semibold rounded-lg
                       hover:bg-cyan-400 hover:shadow-glow
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
                       transition-all duration-200 font-ui
                       flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">◌</span>
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-text-muted text-sm font-ui">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Register Link */}
          <p className="text-center text-text-secondary text-sm">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-accent hover:text-cyan-300 transition-colors font-medium"
            >
              Create one
            </Link>
          </p>
        </div>

        {/* Terminal footer */}
        <div className="mt-6 text-center">
          <p className="text-text-muted text-xs font-mono">
            <span className="text-accent">$</span> hyperclaw --version v0.1.0
          </p>
        </div>
      </div>
    </div>
  );
}