import { describe, expect, it } from 'vitest';

import { assertByteLimit, requireString } from './assertions';

describe('util/assertions', () => {
  describe('requireString', () => {
    it('returns the string when valid', () => {
      expect(requireString('ok', 'err')).toBe('ok');
    });

    it('throws when value is not a string', () => {
      expect(() => requireString(123, 'err')).toThrow('err');
    });

    it('throws when value is empty string', () => {
      expect(() => requireString('', 'err')).toThrow('err');
    });
  });

  describe('assertByteLimit', () => {
    it('passes when within limit (string)', () => {
      expect(() => {
        assertByteLimit('abc', 3, 'err');
      }).not.toThrow();
    });

    it('passes when within limit (object)', () => {
      // {"a":1} is 7 bytes
      expect(() => {
        assertByteLimit({ a: 1 }, 7, 'err');
      }).not.toThrow();
    });

    it('throws when string exceeds limit', () => {
      expect(() => {
        assertByteLimit('abcd', 3, 'err');
      }).toThrow('err');
    });

    it('throws generated message on failure', () => {
      expect(() => {
        assertByteLimit(
          'abcd',
          3,
          (v, l) => `val=${v as string} limit=${String(l)}`,
        );
      }).toThrow('val=abcd limit=3');
    });
  });
});
