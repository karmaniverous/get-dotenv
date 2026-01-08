import { describe, expect, it } from 'vitest';

import { assertLogger } from '../core/GetDotenvOptions';
import { silentLogger } from './logger';

describe('util/logger', () => {
  it('silentLogger implements Logger interface with no-ops', () => {
    expect(() => {
      silentLogger.debug('test');
    }).not.toThrow();
    expect(() => {
      silentLogger.info('test');
    }).not.toThrow();
    expect(() => {
      silentLogger.warn('test');
    }).not.toThrow();
    expect(() => {
      silentLogger.error('test');
    }).not.toThrow();
  });

  describe('assertLogger', () => {
    it('passes valid logger', () => {
      expect(assertLogger(silentLogger)).toBe(silentLogger);
      expect(assertLogger(console)).toBe(console);
    });

    it('throws on missing method', () => {
      const bad = { debug: () => {}, info: () => {}, warn: () => {} };
      expect(() => assertLogger(bad)).toThrow(/must implement/);
    });

    it('throws on non-object', () => {
      expect(() => assertLogger(null)).toThrow(/must be an object/);
    });
  });
});
