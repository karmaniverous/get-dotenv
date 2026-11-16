/** src/diagnostics/log.ts
 * The `-l/--log` output: the composed map, redacted, then entropy warnings.
 * One implementation for the library (`getDotenv({ log: true })`) and the
 * CLI host, so both apply the same settings the same way.
 */
import type { Logger, ProcessEnv } from '@/src/core';

import { type EntropyOptions, maybeWarnEntropy } from './entropy';
import { redactObject, type RedactOptions } from './redact';

/**
 * Print a composed env map through `logger.info` (presentation only):
 * redacted per `options` (3.10.3), followed by one entropy warning line per
 * qualifying key (3.10.4).
 *
 * @param env - The composed map.
 * @param options - Resolved redaction and entropy settings.
 * @param logger - Where the map and the warnings go.
 */
export const logComposedEnv = (
  env: ProcessEnv,
  options: RedactOptions & EntropyOptions,
  logger: Pick<Logger, 'info'>,
): void => {
  logger.info(redactObject(env, options));
  // Every key of the composed map comes from it (an unset value never warns).
  for (const [key, value] of Object.entries(env)) {
    maybeWarnEntropy(key, value, 'dotenv', options, (line) => {
      logger.info(line);
    });
  }
};
