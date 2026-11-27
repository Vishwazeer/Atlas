import { useState } from 'react';
import { highlight } from '../lib/highlight';

export function CodeBlock({ code, label = 'Usage' }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const area = document.createElement('textarea');
      area.value = code;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="code">
      <div className="code__bar">
        <span>{label}</span>
        <button type="button" className="btn btn--ghost btn--small" onClick={copy}>
          {copied ? 'Copied' : 'Copy code'}
        </button>
        <span className="sr-only" aria-live="polite">
          {copied ? 'Code copied to clipboard' : ''}
        </span>
      </div>
      <pre tabIndex={0}>
        <code>{highlight(code)}</code>
      </pre>
    </div>
  );
}
