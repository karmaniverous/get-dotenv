import type { Logger } from '@/src/core';

/**
 * A silent logger that implements the Logger interface but performs no operations.
 */
export const silentLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  log: () => {},
};
