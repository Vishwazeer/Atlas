import { useSyncExternalStore } from 'react';

/** A deliberately tiny history router: two route shapes do not need a dependency. */

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener('popstate', cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('popstate', cb);
  };
}

export function navigate(to: string) {
  if (to === window.location.pathname) return;
  window.history.pushState(null, '', to);
  listeners.forEach((l) => l());
  window.scrollTo({ top: 0 });
}

export function usePathname(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.pathname,
    () => '/',
  );
}

export type Route = { name: 'overview' } | { name: 'chart'; slug: string } | { name: 'not-found'; path: string };

export function matchRoute(pathname: string): Route {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/') return { name: 'overview' };
  const m = /^\/charts\/([a-z0-9-]+)$/.exec(clean);
  if (m?.[1]) return { name: 'chart', slug: m[1] };
  return { name: 'not-found', path: clean };
}

