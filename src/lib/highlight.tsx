import type { ReactNode } from 'react';

const TOKEN = /(\/\/.*$|\/\*[\s\S]*?\*\/)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)|(<\/?[A-Z][\w.]*|<\/?[a-z][\w-]*|\/?>)|\b(import|from|export|const|let|return|function|type|interface|new|true|false|null|undefined)\b|\b(\d[\d_.]*)\b|(\b[a-zA-Z_]\w*(?==))/gm;

/** A small TSX highlighter: enough colour to scan a snippet, no runtime dependency. */
export function highlight(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of code.matchAll(TOKEN)) {
    const index = m.index ?? 0;
    if (index > last) out.push(code.slice(last, index));
    const cls = m[1] ? 'tk-comment' : m[2] ? 'tk-string' : m[3] ? 'tk-tag' : m[4] ? 'tk-keyword' : m[5] ? 'tk-number' : 'tk-attr';
    out.push(
      <span key={key++} className={cls}>
        {m[0]}
      </span>,
    );
    last = index + m[0].length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

