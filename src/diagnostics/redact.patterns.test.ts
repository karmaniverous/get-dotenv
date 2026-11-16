/**
 * #46: the built-in redaction patterns match a secret-like word as a whole
 * word or as an underscore- or dash-delimited segment, and custom patterns
 * add to them instead of replacing them.
 */
import { describe, expect, it } from 'vitest';

import { redactDisplay, redactObject, redactTriple } from './redact';

const on = { redact: true };

describe('redaction patterns (#46)', () => {
  it.each([
    'API_SECRET',
    'DB_PASSWORD',
    'GITHUB_TOKEN',
    'MY_KEY',
    'my-api-key',
    'APIKEY',
    'api_key',
    'SECRET',
    'db-pass',
    'token',
  ])('redacts %s by default', (key) => {
    expect(redactDisplay(key, 'value', on)).toBe('[redacted]');
  });

  it.each(['SECRETARY', 'TOKENIZER', 'PASSPORT', 'MONKEY', 'KEYBOARD', 'APP'])(
    'leaves %s alone (the word is part of a longer word)',
    (key) => {
      expect(redactDisplay(key, 'value', on)).toBe('value');
    },
  );

  it.each(['V2TOKEN', 'MD5PASS', 'X9SECRET', 'TOKEN2', 'KEY9X'])(
    'leaves %s alone (a digit next to the word makes it part of a longer word)',
    (key) => {
      expect(redactDisplay(key, 'value', on)).toBe('value');
    },
  );

  it('custom patterns add to the built-in ones', () => {
    const opts = { redact: true, redactPatterns: ['^MYCODE$', /^pin$/i] };
    expect(
      redactObject({ MYCODE: 'a', PIN: 'b', API_SECRET: 'c', APP: 'd' }, opts),
    ).toEqual({
      MYCODE: '[redacted]',
      PIN: '[redacted]',
      API_SECRET: '[redacted]',
      APP: 'd',
    });
  });

  it('redactTriple uses the same patterns', () => {
    expect(
      redactTriple(
        'GITHUB_TOKEN',
        { parent: 'p', dotenv: 'd', final: 'd' },
        on,
      ),
    ).toEqual({
      parent: '[redacted]',
      dotenv: '[redacted]',
      final: '[redacted]',
    });
  });

  it('nothing is redacted when redaction is off', () => {
    expect(redactDisplay('API_SECRET', 'value', { redact: false })).toBe(
      'value',
    );
  });
});
