import { ChartGlyph } from '../components/ChartGlyph';
import { ContourField } from '../components/ContourField';
import { CHARTS } from '../docs/registry';
import { Link } from '../components/Link';

const SHARED = [
  {
    term: 'Painted by tokens',
    body: 'Marks read CSS variables such as --viz-seq-3 and --viz-sev-high. Switching theme recolours every chart without a React render.',
  },
  {
    term: 'Driven by keyboard',
    body: 'One mark per chart sits in the tab order; arrow keys rove the rest in the chart’s own geometry, and each move is announced.',
  },
  {
    term: 'Readable as a table',
    body: 'Every chart has a “View as table” switch that swaps the picture for a real table with a caption and column headers.',
  },
  {
    term: 'Sized by its container',
    body: 'ResizeObserver measures the plot before paint, so charts fit a sidebar or a full-width page with no layout shift.',
  },
];

export default function Overview() {
  return (
    <div className="overview">
      <section className="hero" aria-labelledby="hero-title">
        <ContourField />
        <div className="hero__copy">
          <p className="kicker">Security visualization kit</p>
          <h1 id="hero-title">Atlas</h1>
          <p className="hero__sub">Charts that read your infrastructure like a map.</p>
          <p className="hero__body">
            Six typed React components for the questions a backup and security console has to answer: what is connected, what failed, where the
            sensitive data sits and whether the SLAs hold.
          </p>
          <div className="hero__actions">
            <Link href="/charts/topology-graph" className="btn btn--primary">
              Open the topology graph
            </Link>
            <a href="https://github.com/Vishwazeer/atlas" className="btn btn--ghost">
              Read the source
            </a>
          </div>
        </div>
      </section>

      <section className="index" aria-labelledby="index-title">
        <div className="section-head">
          <h2 id="index-title">The six charts</h2>
          <p>Each page has a live demo on seeded data, its props, a usage snippet and its keyboard map.</p>
        </div>
        <ol className="index__list">
          {CHARTS.map((c) => (
            <li key={c.slug}>
              <Link href={`/charts/${c.slug}`} className="index__row">
                <span className="index__glyph">
                  <ChartGlyph slug={c.slug} size={22} />
                </span>
                <span className="index__name">
                  <strong>{c.title}</strong>
                  <code>{`<${c.component} />`}</code>
                </span>
                <span className="index__q">{c.question}</span>
                <span className="index__built">{c.builtOn}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="shared" aria-labelledby="shared-title">
        <div className="section-head">
          <h2 id="shared-title">What every chart shares</h2>
          <p>The frame, the keyboard model and the table view live in one ChartShell, so a seventh chart gets them for free.</p>
        </div>
        <dl className="shared__grid">
          {SHARED.map((s) => (
            <div key={s.term}>
              <dt>{s.term}</dt>
              <dd>{s.body}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
