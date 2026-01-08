import { describe, expect, it } from 'vitest';

import {
  parseFiniteNumber,
  parseNonNegativeInt,
  parsePositiveInt,
  toNumber,
} from './parsers';

describe('util/parsers', () => {
  it('returns number when input is number', () => {
    expect(toNumber(123)).toBe(123);
  });

  it('parses valid numeric string', () => {
    expect(toNumber('123')).toBe(123);
    expect(toNumber(' 456 ')).toBe(456);
  });

  it('returns undefined for undefined input', () => {
    expect(toNumber(undefined)).toBeUndefined();
  });

  it('returns undefined for empty or whitespace-only string', () => {
    expect(toNumber('')).toBeUndefined();
    expect(toNumber('   ')).toBeUndefined();
  });

  it('returns NaN for invalid string', () => {
    expect(toNumber('abc')).toBeNaN();
  });

  describe('parseFiniteNumber', () => {
    const parse = parseFiniteNumber('val');
    it('parses valid number', () => {
      expect(parse('123.45')).toBe(123.45);
    });
    it('throws on non-finite', () => {
      expect(() => parse('abc')).toThrow(/val must be a number/);
    });
  });

  describe('parsePositiveInt', () => {
    const parse = parsePositiveInt('val');
    it('parses positive integer', () => {
      expect(parse('10')).toBe(10);
    });
    it('throws on zero', () => {
      expect(() => parse('0')).toThrow(/val must be a positive integer/);
    });
    it('throws on float', () => {
      expect(() => parse('1.5')).toThrow(/val must be a positive integer/);
    });
  });

  describe('parseNonNegativeInt', () => {
    const parse = parseNonNegativeInt('val');
    it('parses zero', () => {
      expect(parse('0')).toBe(0);
    });
    it('throws on negative', () => {
      expect(() => parse('-1')).toThrow(/val must be a non-negative integer/);
    });
  });
});
