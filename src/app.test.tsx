import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { matchRoute } from './lib/router';
import { highlight } from './lib/highlight';
import { CHARTS } from './docs/registry';

describe('router', () => {
  it('matches overview, chart pages and unknown paths', () => {
    expect(matchRoute('/')).toEqual({ name: 'overview' });
    expect(matchRoute('/charts/data-treemap/')).toEqual({ name: 'chart', slug: 'data-treemap' });
    expect(matchRoute('/nope')).toEqual({ name: 'not-found', path: '/nope' });
  });
});

describe('code highlighter', () => {
  it('keeps the source text intact', () => {
    const code = `import { A } from 'x';\n<A value={1} />`;
    const { container } = render(<pre>{highlight(code)}</pre>);
    expect(container.textContent).toBe(code);
    expect(container.querySelector('.tk-string')?.textContent).toBe("'x'");
  });
});

describe('App shell', () => {
  it('renders the brand, subheading and the six charts in the nav', () => {
    window.history.pushState(null, '', '/');
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Atlas' })).toBeInTheDocument();
    expect(screen.getByText('Charts that read your infrastructure like a map.')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Charts' });
    for (const c of CHARTS) expect(nav).toHaveTextContent(c.title);
  });

  it('toggles the theme attribute on <html>', async () => {
    const user = userEvent.setup();
    document.documentElement.setAttribute('data-theme', 'dark');
    window.history.pushState(null, '', '/');
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Switch to light theme' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('lazy-loads a chart page behind a skeleton', async () => {
    window.history.pushState(null, '', '/charts/sla-rings');
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: 'SLA rings' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Props' })).toBeInTheDocument();
  });
});
