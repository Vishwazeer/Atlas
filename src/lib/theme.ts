import { useCallback, useSyncExternalStore } from 'react';

export type Theme = 'dark' | 'light';
const KEY = 'atlas-theme';
const listeners = new Set<() => void>();

function read(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* storage can be blocked; the attribute still applies for this visit */
  }
  listeners.forEach((l) => l());
}

export function useTheme() {
  const theme = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => 'light' as Theme,
  );
  const toggle = useCallback(() => applyTheme(theme === 'dark' ? 'light' : 'dark'), [theme]);
  return { theme, toggle };
}
