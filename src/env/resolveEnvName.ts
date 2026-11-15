/**
 * Select the environment from `env`, falling back to `defaultEnv`. An empty
 * string counts as unset.
 *
 * @param env - The requested environment.
 * @param defaultEnv - The fallback environment.
 * @returns The selected environment, or `undefined` when neither is set.
 *
 * @internal
 */
export const resolveEnvName = (
  env?: string,
  defaultEnv?: string,
): string | undefined =>
  typeof env === 'string' && env.length > 0
    ? env
    : typeof defaultEnv === 'string' && defaultEnv.length > 0
      ? defaultEnv
      : undefined;
