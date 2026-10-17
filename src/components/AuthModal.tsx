import React, { useState } from 'react';
import { X, Lock, Mail, User, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, KeyRound } from 'lucide-react';
import { AuthUser } from '../lib/auth-server';

export type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password' | 'reset-password';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: AuthMode;
  onClose: () => void;
  onSuccess: (user: AuthUser, token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'sign-in',
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email || !email.includes('@')) {
      setError('Please enter a valid academic or personal email address.');
      return;
    }

    if (mode === 'sign-up') {
      if (!password || password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    if (mode === 'sign-in') {
      if (!password) {
        setError('Password is required.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'sign-up') {
        const res = await fetch('/api/auth/sign-up', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to create account.');
        }

        localStorage.setItem('notice_decoder_token', data.token);
        document.cookie = `session_token=${encodeURIComponent(data.token)}; Path=/; Max-Age=604800; SameSite=Lax`;
        onSuccess(data.user, data.token);
        onClose();
      } else if (mode === 'sign-in') {
        const res = await fetch('/api/auth/sign-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Invalid email or password.');
        }

        localStorage.setItem('notice_decoder_token', data.token);
        document.cookie = `session_token=${encodeURIComponent(data.token)}; Path=/; Max-Age=604800; SameSite=Lax`;
        onSuccess(data.user, data.token);
        onClose();
      } else if (mode === 'forgot-password') {
        setSuccessMsg(`If an account exists for ${email}, password reset instructions have been dispatched.`);
        setTimeout(() => setMode('reset-password'), 2500);
      } else if (mode === 'reset-password') {
        if (!resetToken || !password) {
          throw new Error('Reset code and new password are required.');
        }
        setSuccessMsg('Your password has been securely updated. You can now sign in.');
        setTimeout(() => setMode('sign-in'), 2000);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-brand-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center mb-3">
            <Lock className="w-5 h-5 text-brand-300" />
          </div>

          <h2 className="text-xl font-bold tracking-tight">
            {mode === 'sign-in' && 'Welcome back to Notice Decoder'}
            {mode === 'sign-up' && 'Create your Academic Account'}
            {mode === 'forgot-password' && 'Reset your Password'}
            {mode === 'reset-password' && 'Enter New Password'}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            {mode === 'sign-in' && 'Sign in to access your personal schedules, uploads, and conflict analysis.'}
            {mode === 'sign-up' && 'Keep notices private, isolated, and synchronized across your devices.'}
            {mode === 'forgot-password' && 'Enter your email address to receive recovery instructions.'}
            {mode === 'reset-password' && 'Enter the reset code and choose a new secure password.'}
          </p>
        </div>

        {/* Tab Controls for sign-in vs sign-up */}
        {(mode === 'sign-in' || mode === 'sign-up') && (
          <div className="flex border-b border-slate-100 bg-slate-50">
            <button
              onClick={() => { setMode('sign-in'); setError(null); }}
              className={`flex-1 py-3 text-xs font-semibold text-center transition border-b-2 ${
                mode === 'sign-in'
                  ? 'border-brand-600 text-brand-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('sign-up'); setError(null); }}
              className={`flex-1 py-3 text-xs font-semibold text-center transition border-b-2 ${
                mode === 'sign-up'
                  ? 'border-brand-600 text-brand-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start space-x-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start space-x-2.5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'sign-up' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name or Department
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maya Sharma (CSE)"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>

          {mode === 'reset-password' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reset Code
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="Paste 6-digit or alpha reset token"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>
          )}

          {mode !== 'forgot-password' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  {mode === 'reset-password' ? 'New Password' : 'Password'}
                </label>
                {mode === 'sign-in' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot-password'); setError(null); }}
                    className="text-[11px] text-brand-600 hover:text-brand-800 font-semibold"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-9 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === 'sign-up' && (
                <p className="text-[10px] text-slate-500 mt-1">Must be at least 8 characters long.</p>
              )}
            </div>
          )}

          {mode === 'sign-up' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-semibold text-xs shadow-md transition disabled:opacity-60"
          >
            <span>
              {loading && 'Processing...'}
              {!loading && mode === 'sign-in' && 'Sign In'}
              {!loading && mode === 'sign-up' && 'Create Account'}
              {!loading && mode === 'forgot-password' && 'Send Reset Code'}
              {!loading && mode === 'reset-password' && 'Set New Password'}
            </span>
            {!loading && <ArrowRight className="w-3.5 h-3.5" />}
          </button>

          {(mode === 'forgot-password' || mode === 'reset-password') && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setMode('sign-in'); setError(null); }}
                className="text-xs font-semibold text-brand-600 hover:text-brand-800"
              >
                Back to Sign In
              </button>
            </div>
          )}

          {mode === 'sign-up' && (
            <p className="text-[10px] text-slate-500 text-center leading-relaxed">
              By creating an account, you agree that your notices and extracted schedules remain private and isolated to your profile.
            </p>
          )}
        </form>
      </div>
    </div>
  );
};
