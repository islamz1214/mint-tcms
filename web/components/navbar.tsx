'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useOrganization } from '@/lib/organization-context';
import { useTheme } from '@/lib/theme-context';
import MintLogo from './mint-logo';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/projects', label: 'Projects' },
];

function SunIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const {
    organizations,
    currentOrganization,
    currentOrganizationId,
  } = useOrganization();
  const { theme, toggleTheme } = useTheme();
  const hasOrganizations = organizations.length > 0;

  if (!user) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-mint-100 bg-white/80 backdrop-blur dark:border-mint-900 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/dashboard"
            className="shrink-0 flex items-center gap-2 text-lg font-bold tracking-tight text-mint-600 dark:text-mint-400 hover:text-mint-700 dark:hover:text-mint-300 transition-colors"
          >
            <MintLogo size="md" />
            <span>Mint TCMS</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-mint-100 text-mint-900 dark:bg-mint-900 dark:text-mint-100'
                      : 'text-zinc-600 hover:text-mint-600 dark:text-zinc-400 dark:hover:text-mint-400'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {hasOrganizations && currentOrganizationId && (
            <p className="max-w-[220px] truncate text-sm text-zinc-500 dark:text-zinc-400">
              {currentOrganization?.name}
            </p>
          )}
          <button
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-mint-50 hover:text-mint-600 dark:text-zinc-400 dark:hover:bg-mint-900 dark:hover:text-mint-400"
          >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>
          <Link
            href="/profile"
            className="hidden max-w-[160px] truncate text-sm text-zinc-500 transition-colors hover:text-zinc-900 sm:block dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            {user.email}
          </Link>
          <button
            onClick={logout}
            className="whitespace-nowrap rounded-md border border-mint-200 px-3 py-1.5 text-sm font-medium text-mint-600 transition-colors hover:border-mint-300 hover:bg-mint-50 hover:text-mint-700 dark:border-mint-800 dark:text-mint-400 dark:hover:border-mint-700 dark:hover:bg-mint-900 dark:hover:text-mint-300"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
