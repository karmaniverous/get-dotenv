/**
 * Review 5916926264 (nit): the editor appends a new key only when dotenv can
 * read it back as that key. dotenv reads a key as `[\w.-]+`; any other key
 * (a space, `=`, a line break) would be written as a line dotenv never
 * reads, or reads as something else.
 */
import { parse } from 'dotenv';
import { describe, expect, it } from 'vitest';

import { editDotenvText } from './editDotenvText';

describe('editor: a new key must be a key dotenv reads (review 5916926264)', () => {
  it.each(['BAD KEY', 'A=B', 'A\nEVIL', 'export X', '', 'K\u00e9'])(
    'rejects %j',
    (key) => {
      expect(() => editDotenvText('A=1\n', { [key]: 'v' })).toThrow(
        `can't add dotenv key ${JSON.stringify(key)}`,
      );
    },
  );

  it.each(['my-key', 'a.b', 'A_1', '9LIVES'])('accepts %j', (key) => {
    const out = editDotenvText('A=1\n', { [key]: 'v' });
    expect(parse(out)[key]).toBe('v');
  });

  it('an existing key is edited as before, and a null for an absent bad key is a no-op', () => {
    expect(editDotenvText('A=1\n', { A: '2', 'BAD KEY': null })).toBe('A=2\n');
  });
});
