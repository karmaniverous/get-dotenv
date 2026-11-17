/**
 * Review 5916926264 #6: a caller RegExp with the `g` or `y` flag must match
 * every key, not every other one. `RegExp.prototype.test` on such a pattern
 * starts at `lastIndex` and moves it, so reusing the caller's object made
 * redaction and the entropy whitelist hit and miss.
 */
import { describe, expect, it } from 'vitest';

import { maybeWarnEntropy } from './entropy';
import { compileKeyPatterns } from './keyPatterns';
import { redactObject } from './redact';

const KEYS = ['PIN_A', 'PIN_B', 'PIN_C', 'PIN_D'];

describe('key patterns with g or y flags (review 5916926264 #6)', () => {
  it.each(['g', 'y', 'gy', 'giy'])(
    'redaction masks every matching key with /^PIN_/%s',
    (flags) => {
      const pattern = new RegExp('^PIN_', flags);
      const shown = redactObject(
        Object.fromEntries(KEYS.map((k) => [k, 'v'])),
        { redact: true, redactPatterns: [pattern] },
      );
      expect(Object.values(shown)).toEqual(KEYS.map(() => '[redacted]'));
      // The caller's RegExp is left as it was.
      expect(pattern.lastIndex).toBe(0);
    },
  );

  it('the entropy whitelist skips every matching key with a g pattern', () => {
    const lines: string[] = [];
    const whitelist = [/^WL_/g];
    for (const key of ['WL_ONE', 'WL_TWO', 'WL_THREE'])
      maybeWarnEntropy(
        key,
        'aB3$xY9!qW7#zK2@mN5%',
        'dotenv',
        { entropyWhitelist: whitelist },
        (l) => lines.push(l),
      );
    expect(lines).toEqual([]);
  });

  it('strings compile case-insensitively; RegExps keep their other flags', () => {
    const [s, r] = compileKeyPatterns(['^a$', /^b$/gimsuy]);
    expect(s?.flags).toBe('i');
    expect(r?.flags).toBe('imsu');
    expect(r?.source).toBe('^b$');
  });
});
