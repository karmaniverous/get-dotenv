/**
 * Whether the process runs under a test runner (Vitest, or
 * `GETDOTENV_TEST=1`). Under one, the host and its plugins don't call
 * `process.exit` and don't print top-level help.
 *
 * @returns Whether it does.
 */
export const underTestRunner = (): boolean =>
  process.env.GETDOTENV_TEST === '1' ||
  typeof process.env.VITEST_WORKER_ID === 'string';
