/**
 * `applyDotenvEdits` returns a document that can be edited again (#66
 * follow-up): when a key is appended after a last line with no final
 * newline, that line gets the file EOL in its segment too, so a second edit
 * of it keeps the line break.
 */
import { describe, expect, it } from 'vitest';

import { applyDotenvEdits } from './applyDotenvEdits';
import { parseDotenvDocument } from './parseDotenvDocument';
import { renderDotenvDocument } from './renderDotenvDocument';

describe('applyDotenvEdits: editing an edited document', () => {
  it.each([
    ['LF', 'X=0\nA=1', 'X=0\nA=9\nB=2'],
    ['CRLF', 'X=0\r\nA=1', 'X=0\r\nA=9\r\nB=2'],
  ])(
    '%s: a last line that gained an EOL keeps it when edited again',
    (_eol, text, expected) => {
      const once = applyDotenvEdits(parseDotenvDocument(text), { B: '2' });
      const twice = applyDotenvEdits(once, { A: '9' });
      expect(renderDotenvDocument(twice)).toBe(expected);
    },
  );
});
