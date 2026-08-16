'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('mint-theme') as Theme | null;
    const initial = stored ?? 'light';
    setTheme(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');
    setMounted(true);
  }, []);

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('mint-theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  }

  // Prevent flash — render children immediately but theme context updates after mount
  return (
    <ThemeContext.Provider value={{ theme: mounted ? theme : 'light', toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
