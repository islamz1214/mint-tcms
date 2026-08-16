'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import MintLogo from '@/components/mint-logo';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setError((err.body?.message as string) || 'Invalid email or password');
      } else if (err instanceof Error) {
        const isNetworkError =
          err.message.includes('Failed to fetch') ||
          err.message.includes('NetworkError') ||
          err.message.includes('Load failed');
        setError(isNetworkError ? 'Cannot reach the server. Please try again in a moment.' : 'Something went wrong');
      } else {
        setError('Something went wrong');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-mint-50 dark:bg-zinc-950">
      <div className="w-full max-w-sm space-y-6 mint-card mint-200 bg-white p-8 shadow-sm dark:border-mint-800 dark:bg-zinc-900">
        <div className="flex items-center justify-center mb-4">
          <MintLogo size="lg" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-center text-mint-900 dark:text-mint-100">
            Mint TCMS
          </h1>
          <p className="mt-2 text-sm text-center text-zinc-500 dark:text-zinc-400">
            Enter your credentials to access your account
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-mint-500 focus:outline-none focus:ring-1 focus:ring-mint-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-mint-500 focus:outline-none focus:ring-1 focus:ring-mint-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-mint-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-mint-700 disabled:opacity-50 dark:bg-mint-600 dark:text-white dark:hover:bg-mint-500"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-mint-600 underline-offset-4 hover:underline dark:text-mint-400">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
