import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  /* ─── Initialisation ────────────────────────────────────────────────
     Priorité : localStorage → préférence système → clair par défaut   */
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('wg-theme');
    if (saved !== null) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  /* ─── Synchroniser la classe <html> ─────────────────────────────── */
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('wg-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  /* ─── Écouter les changements de préférence système ─────────────── */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      /* Ne réagir que si l'utilisateur n'a pas de préférence sauvegardée */
      if (localStorage.getItem('wg-theme') === null) {
        setIsDark(e.matches);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggle = () => setIsDark(v => !v);

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}