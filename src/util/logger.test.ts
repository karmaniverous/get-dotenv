import { describe, expect, it } from 'vitest';

import { silentLogger } from './logger';

describe('util/logger', () => {
  it('implements Logger interface with no-ops', () => {
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
    expect(() => {
      silentLogger.log('test');
    }).not.toThrow();
  });
});
