/**
 * Render a parsed dotenv document back to text.
 *
 * Requirements addressed:
 * - Preserve existing EOLs by default; support forcing LF/CRLF.
 * - Preserve trailing newline presence/absence.
 *
 * @packageDocumentation
 */

import type { DotenvDocument, DotenvEolMode } from './types';

const normalizeEol = (txt: string, eol: '\n' | '\r\n'): string =>
  txt.replace(/\r?\n/g, eol);

const stripOneFinalNewline = (txt: string): string => {
  if (txt.endsWith('\r\n')) return txt.slice(0, -2);
  if (txt.endsWith('\n')) return txt.slice(0, -1);
  return txt;
};

const endsWithNewline = (txt: string): boolean =>
  txt.endsWith('\n') || txt.endsWith('\r\n');

/**
 * Render a {@link DotenvDocument} to text.
 *
 * @param doc - Document to render.
 * @param eolMode - EOL policy (`preserve` | `lf` | `crlf`).
 * @returns Rendered dotenv text.
 *
 * @public
 */
export function renderDotenvDocument(
  doc: DotenvDocument,
  eolMode: DotenvEolMode = 'preserve',
): string {
  const joined = doc.segments.map((s) => s.raw).join('');

  const targetEol: '\n' | '\r\n' =
    eolMode === 'crlf' ? '\r\n' : eolMode === 'lf' ? '\n' : doc.fileEol;

  const normalized =
    eolMode === 'preserve' ? joined : normalizeEol(joined, targetEol);

  // Preserve final newline presence/absence.
  if (doc.trailingNewline) {
    return endsWithNewline(normalized) ? normalized : normalized + targetEol;
  }
  return stripOneFinalNewline(normalized);
}
