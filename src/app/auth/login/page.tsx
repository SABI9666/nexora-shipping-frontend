'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import { NexoraLogo } from '@/components/ui/NexoraLogo';
import api from '@/lib/api';
import { setStoredAuth } from '@/lib/auth';
import { User } from '@/types';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

interface LoginResponse { user: User; accessToken: string; refreshToken: string; }

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'user' | 'admin'>('user');
  const router = useRouter();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      if (mode === 'admin') {
        // Admin login — checks ADMIN_EMAIL + ADMIN_PASSWORD on the server
        const res = await api.post<{ success: boolean; data: LoginResponse }>('/auth/admin-login', data);
        const { user, accessToken, refreshToken } = res.data.data;
        setStoredAuth(user, accessToken, refreshToken);
        router.push('/admin/users');
      } else {
        // Regular user login
        const res = await api.post<{ success: boolean; data: LoginResponse }>('/auth/login', data);
        const { user, accessToken, refreshToken } = res.data.data;
        setStoredAuth(user, accessToken, refreshToken);
        // Redirect by role
        router.push(user.role === 'ADMIN' ? '/admin/users' : '/dashboard');
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Invalid credentials. Please try again.');
    }
  };

  const isAdmin = mode === 'admin';

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-500 ${isAdmin ? 'bg-[#060B1A]' : 'bg-gradient-to-br from-brand-navy-dark to-brand-navy'}`}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-white rounded-2xl px-5 py-3 mb-4 shadow-lg">
            <NexoraLogo height={44} />
          </div>
          <h1 className="text-2xl font-bold text-white">
            {isAdmin ? 'Admin Portal' : 'Welcome Back'}
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            {isAdmin ? 'Restricted — authorized personnel only' : 'Sign in to your Nexora account'}
          </p>
        </div>

        {/* Tab toggle */}
        <div className="flex rounded-xl overflow-hidden border border-white/10 mb-6">
          <button
            type="button"
            onClick={() => { setMode('user'); setError(''); }}
            className={`flex-1 py-2.5 text-sm font-semibold transition-all ${!isAdmin ? 'bg-white text-brand-navy' : 'text-slate-400 hover:text-white'}`}
          >
            User Login
          </button>
          <button
            type="button"
            onClick={() => { setMode('admin'); setError(''); }}
            className={`flex-1 py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${isAdmin ? 'bg-brand-red text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Shield className="w-3.5 h-3.5" /> Admin Login
          </button>
        </div>

        {/* Card */}
        <div className={`rounded-2xl shadow-2xl p-8 transition-all duration-300 ${isAdmin ? 'bg-white/5 border border-white/10' : 'bg-white'}`}>

          {isAdmin && (
            <div className="mb-5 p-3 bg-amber-950/40 border border-amber-700/30 rounded-xl">
              <p className="text-amber-400/80 text-xs leading-relaxed">
                Use the <strong className="text-amber-400">ADMIN_EMAIL</strong> and <strong className="text-amber-400">ADMIN_PASSWORD</strong> values you set in your Render environment variables.
              </p>
            </div>
          )}

          {error && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${isAdmin ? 'bg-red-950/60 border border-red-700/40 text-red-400' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isAdmin ? 'text-slate-400 uppercase tracking-wider' : 'form-label'}`}>
                {isAdmin ? 'Admin Email' : 'Email Address'}
              </label>
              <input
                {...register('email')}
                type="email"
                className={isAdmin
                  ? 'w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:border-brand-red/40 text-sm'
                  : 'form-input w-full'}
                placeholder={isAdmin ? 'admin@company.com' : 'you@company.com'}
                autoComplete="email"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isAdmin ? 'text-slate-400 uppercase tracking-wider' : 'form-label'}`}>
                {isAdmin ? 'Admin Password' : 'Password'}
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className={isAdmin
                    ? 'w-full px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-red/40 text-sm pr-10'
                    : 'form-input w-full pr-10'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${isAdmin ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-60 transition-all ${
                isAdmin
                  ? 'bg-brand-red hover:bg-brand-red-dark text-white shadow-lg shadow-brand-red/20'
                  : 'btn-primary'
              }`}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : isAdmin ? <Shield className="w-4 h-4" /> : null}
              {isSubmitting ? 'Signing in...' : isAdmin ? 'Access Admin Portal' : 'Sign In'}
            </button>
          </form>

          {!isAdmin && (
            <p className="text-center text-sm text-slate-500 mt-6">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="text-brand-navy font-medium hover:underline">
                Create account
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
