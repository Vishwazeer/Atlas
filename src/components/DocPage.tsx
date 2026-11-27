import type { ReactNode } from 'react';
import { CHARTS } from '../docs/registry';
import { Link } from './Link';
import { CodeBlock } from './CodeBlock';

export interface PropRow {
  name: string;
  type: string;
  default?: string;
  description: string;
  required?: boolean;
}

export interface KeyRow {
  keys: string[];
  action: string;
}

export interface DocPageProps {
  slug: string;
  lede: string;
  demo: ReactNode;
  /** Optional panel beside / under the demo (selection readout, etc.). */
  aside?: ReactNode;
  usage: string;
  props: PropRow[];
  keyboard: KeyRow[];
  a11y: string[];
  dataNote: string;
}

export function DocPage({ slug, lede, demo, aside, usage, props, keyboard, a11y, dataNote }: DocPageProps) {
  const index = CHARTS.findIndex((c) => c.slug === slug);
  const entry = CHARTS[index];
  const prev = CHARTS[index - 1];
  const next = CHARTS[index + 1];
  if (!entry) return null;

  return (
    <article className="doc">
      <header className="doc__head">
        <p className="doc__crumb">
          <Link href="/">Atlas</Link>
          <span aria-hidden="true">/</span>
          <span>Charts</span>
        </p>
        <h1>{entry.title}</h1>
        <p className="doc__lede">{lede}</p>
        <dl className="doc__facts">
          <div>
            <dt>Component</dt>
            <dd>
              <code>{`<${entry.component} />`}</code>
            </dd>
          </div>
          <div>
            <dt>Built on</dt>
            <dd>
              <code>{entry.builtOn}</code>
            </dd>
          </div>
        </dl>
      </header>

      <section className="doc__stage" aria-label="Live demo">
        {demo}
        {aside}
      </section>

      <section className="doc__section" aria-labelledby={`${slug}-usage`}>
        <h2 id={`${slug}-usage`}>Usage</h2>
        <CodeBlock code={usage} />
      </section>

      <section className="doc__section" aria-labelledby={`${slug}-props`}>
        <h2 id={`${slug}-props`}>Props</h2>
        <div className="props" role="region" aria-label="Props table" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">Prop</th>
                <th scope="col">Type</th>
                <th scope="col">Default</th>
                <th scope="col">Description</th>
              </tr>
            </thead>
            <tbody>
              {props.map((p) => (
                <tr key={p.name}>
                  <td>
                    <code>{p.name}</code>
                    {p.required && <span className="req">required</span>}
                  </td>
                  <td>
                    <code className="type">{p.type}</code>
                  </td>
                  <td>{p.default ? <code>{p.default}</code> : <span className="muted">none</span>}</td>
                  <td>{p.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="doc__section doc__split" aria-labelledby={`${slug}-a11y`}>
        <div>
          <h2 id={`${slug}-a11y`}>Accessibility</h2>
          <ul className="notes">
            {a11y.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Keyboard</h2>
          <table className="keys">
            <tbody>
              {keyboard.map((k) => (
                <tr key={k.action}>
                  <th scope="row">
                    {k.keys.map((key) => (
                      <kbd key={key}>{key}</kbd>
                    ))}
                  </th>
                  <td>{k.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="doc__section" aria-labelledby={`${slug}-data`}>
        <h2 id={`${slug}-data`}>Demo data</h2>
        <p className="doc__p">{dataNote}</p>
      </section>

      <nav className="pager" aria-label="Chart pages">
        {prev ? (
          <Link href={`/charts/${prev.slug}`} className="pager__link">
            <span>Previous</span>
            {prev.title}
          </Link>
        ) : (
          <Link href="/" className="pager__link">
            <span>Previous</span>
            Overview
          </Link>
        )}
        {next && (
          <Link href={`/charts/${next.slug}`} className="pager__link pager__link--next">
            <span>Next</span>
            {next.title}
          </Link>
        )}
      </nav>
    </article>
  );
}
