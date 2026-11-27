import { Suspense, useEffect } from 'react';
import { LogoMark } from './components/Logo';
import { ThemeToggle } from './components/ThemeToggle';
import { ChartGlyph } from './components/ChartGlyph';
import { DocSkeleton } from './components/Skeleton';
import { CHARTS, findChart } from './docs/registry';
import { matchRoute, usePathname } from './lib/router';
import { Link } from './components/Link';
import Overview from './pages/Overview';


const BASE_TITLE = 'Atlas | Security visualization kit';

export default function App() {
  const pathname = usePathname();
  const route = matchRoute(pathname);
  const chart = route.name === 'chart' ? findChart(route.slug) : undefined;

  useEffect(() => {
    document.title = chart ? `${chart.title} | Atlas` : BASE_TITLE;
  }, [chart]);

  let content;
  if (route.name === 'overview') content = <Overview />;
  else if (chart) content = <chart.Page />;
  else content = <NotFound />;

  return (
    <div className="shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <Link href="/" className="brand" aria-label="Atlas, home">
          <LogoMark size={22} />
          <span className="brand__name">Atlas</span>
          <span className="brand__kicker">Security visualization kit</span>
        </Link>
        <div className="topbar__end">
          <span className="topbar__version">v0.1.0</span>
          <a className="topbar__link" href="https://github.com/Vishwazeer/atlas">
            GitHub
          </a>
          <ThemeToggle />
        </div>
      </header>
      <nav className="sidebar" aria-label="Charts">
        <Link href="/" className="side-link" aria-current={route.name === 'overview' ? 'page' : undefined}>
          Overview
        </Link>
        <p className="side-group">Charts</p>
        <ul>
          {CHARTS.map((c) => (
            <li key={c.slug}>
              <Link href={`/charts/${c.slug}`} className="side-link" aria-current={chart?.slug === c.slug ? 'page' : undefined}>
                <ChartGlyph slug={c.slug} />
                {c.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main id="main" className="main" tabIndex={-1}>
        <Suspense fallback={<DocSkeleton />}>
          <div key={pathname} className="page">
            {content}
          </div>
        </Suspense>
        <footer className="footer">
          <span>Atlas is part of a five-project UI portfolio by Vishwajeet.</span>
          <span>Every number on these pages is seeded mock data.</span>
        </footer>
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <div className="doc">
      <h1>No chart at this address</h1>
      <p className="doc__lede">The link may be from an older version of the kit. The six charts are in the sidebar, or start from the overview.</p>
      <p>
        <Link href="/" className="btn btn--primary">
          Go to the overview
        </Link>
      </p>
    </div>
  );
}
