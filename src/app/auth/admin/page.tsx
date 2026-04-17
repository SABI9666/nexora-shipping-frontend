'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, ShieldAlert, Lock, AlertTriangle } from 'lucide-react';
import { NexoraLogo } from '@/components/ui/NexoraLogo';
import api from '@/lib/api';
import { setStoredAuth } from '@/lib/auth';
import { User } from '@/types';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const res = await api.post<{ success: boolean; data: LoginResponse }>('/auth/admin-login', data);
      const { user, accessToken, refreshToken } = res.data.data;
      setStoredAuth(user, accessToken, refreshToken);
      router.push('/admin/users');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Access denied. Invalid credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-[#060B1A] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-red/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-white rounded-2xl px-5 py-3 mb-6 shadow-2xl">
            <NexoraLogo height={40} />
          </div>

          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-8 h-8 bg-brand-red/20 border border-brand-red/30 rounded-lg flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-brand-red" />
            </div>
            <span className="text-brand-red text-xs font-bold uppercase tracking-widest">Admin Portal</span>
          </div>

          <h1 className="text-2xl font-bold text-white mb-1">Restricted Access</h1>
          <p className="text-slate-500 text-sm">Authorized personnel only</p>
        </div>

        {/* Warning banner */}
        <div className="flex items-start gap-3 bg-amber-950/40 border border-amber-700/30 rounded-xl p-3.5 mb-6">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-amber-400/80 text-xs leading-relaxed">
            This portal is for system administrators only. All login attempts are monitored and logged. Unauthorized access is prohibited.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.05] border border-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="mb-5 flex items-center gap-2.5 p-3.5 bg-red-950/60 border border-red-700/40 rounded-xl text-red-400 text-sm">
              <Lock className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Admin Email
              </label>
              <input
                {...register('email')}
                type="email"
                className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:border-brand-red/40 text-sm transition-all"
                placeholder="admin@company.com"
                autoComplete="email"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1.5">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Admin Password
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:border-brand-red/40 text-sm pr-10 transition-all"
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1.5">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-brand-red hover:bg-brand-red-dark text-white font-semibold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-brand-red/20 disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldAlert className="w-4 h-4" />
              )}
              {isSubmitting ? 'Authenticating...' : 'Access Admin Portal'}
            </button>
          </form>
        </div>

        {/* Back link */}
        <p className="text-center mt-6">
          <Link href="/auth/login" className="text-slate-600 hover:text-slate-400 text-sm transition-colors">
            ← Back to user login
          </Link>
        </p>
      </div>
    </div>
  );
}
