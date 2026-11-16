/**
 * #66: a key appended to a file whose last line has no final newline goes on
 * its own line, in the file's EOL style, and the file still ends without one.
 */
import { parse } from 'dotenv';
import { describe, expect, it } from 'vitest';

import { editDotenvText } from './editDotenvText';

const cases: Array<[name: string, text: string, out: string]> = [
  ['issue repro', 'A=1', 'A=1\nB=2'],
  ['CRLF file', 'A=1\r\nC=3', 'A=1\r\nC=3\r\nB=2'],
  ['last line is a comment', 'A=1\n# end', 'A=1\n# end\nB=2'],
  ['last line is a bare key', 'K', 'K\nB=2'],
  ['last line closes a multiline value', 'M="a\nb"', 'M="a\nb"\nB=2'],
  ['empty file', '', 'B=2'],
  ['file with a final newline', 'A=1\n', 'A=1\nB=2\n'],
  ['CRLF file with a final newline', 'A=1\r\n', 'A=1\r\nB=2\r\n'],
];

describe('editDotenvText appends after a last line with no EOL (#66)', () => {
  it.each(cases)('%s', (_name, text, out) => {
    expect(editDotenvText(text, { B: '2' })).toBe(out);
  });

  it('several new keys each get their own line', () => {
    const out = editDotenvText('A=1', { B: '2', C: '3' });
    expect(out).toBe('A=1\nB=2\nC=3');
    expect(parse(out)).toEqual({ A: '1', B: '2', C: '3' });
  });

  it('an in-place update with nothing appended keeps the last line as it is', () => {
    expect(editDotenvText('A=1', { A: '2' })).toBe('A=2');
  });
});
