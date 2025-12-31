import { describe, expect, it } from 'vitest';

import { editDotenvText } from './editDotenvText';

describe('dotenv/edit/editDotenvText', () => {
  it('preserves unknown lines, comments, blanks, and ordering', () => {
    const input = [
      '# header',
      '',
      'APP_SETTING=one',
      'not-an-assignment line stays',
      '',
      'ENV_SETTING=two',
      '',
    ].join('\n');

    const out = editDotenvText(input, { APP_SETTING: 'updated' });
    expect(out).toContain(
      '# header\n\nAPP_SETTING=updated\nnot-an-assignment line stays\n\nENV_SETTING=two\n',
    );
  });

  it('updates all duplicate keys by default', () => {
    const input = ['A=1', 'A=2', 'A=3', ''].join('\n');
    const out = editDotenvText(input, { A: 'x' });
    expect(out).toBe(['A=x', 'A=x', 'A=x', ''].join('\n'));
  });

  it('supports first/last duplicate strategies', () => {
    const input = ['A=1', 'A=2', 'A=3', ''].join('\n');
    const first = editDotenvText(input, { A: 'x' }, { duplicateKeys: 'first' });
    expect(first).toBe(['A=x', 'A=2', 'A=3', ''].join('\n'));

    const last = editDotenvText(input, { A: 'x' }, { duplicateKeys: 'last' });
    expect(last).toBe(['A=1', 'A=2', 'A=x', ''].join('\n'));
  });

  it('converts bare-key placeholders into assignments and preserves inline comments', () => {
    const input = ['FOO', 'BAR   # keep', ''].join('\n');
    const out = editDotenvText(input, { FOO: '1', BAR: '2' });
    expect(out).toBe(['FOO=1', 'BAR=2   # keep', ''].join('\n'));
  });

  it('deletes keys when value is null (default nullBehavior=delete)', () => {
    const input = ['A=1', 'B=2', ''].join('\n');
    const out = editDotenvText(input, { A: null });
    expect(out).toBe(['B=2', ''].join('\n'));
  });

  it('sync mode deletes assignments not present in the update map (but preserves comments/unknown)', () => {
    const input = ['# c', 'A=1', 'B=2', 'raw line', ''].join('\n');
    const out = editDotenvText(input, { A: 'x' }, { mode: 'sync' });
    expect(out).toBe(['# c', 'A=x', 'raw line', ''].join('\n'));
  });

  it('sync mode does not delete a key that is present with undefined (undefinedBehavior=skip)', () => {
    const input = ['A=1', 'B=2', ''].join('\n');
    const out = editDotenvText(input, { A: undefined }, { mode: 'sync' });
    // A is present (own key), but undefined => skip update; B absent => deleted.
    expect(out).toBe(['A=1', ''].join('\n'));
  });

  it('quotes multiline values (double-quoted) for correctness', () => {
    const input = ['MULTI=old', ''].join('\n');
    const out = editDotenvText(input, { MULTI: 'a\nb\nc' });
    expect(out).toBe(['MULTI="a', 'b', 'c"', ''].join('\n'));
  });

  it('forces CRLF when eol=crlf', () => {
    const input = 'A=1\nB=2\n';
    const out = editDotenvText(input, { B: 'x' }, { eol: 'crlf' });
    expect(out).toBe('A=1\r\nB=x\r\n');
  });
});
