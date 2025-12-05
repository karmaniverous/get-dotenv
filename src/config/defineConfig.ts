import type { Scripts } from '../cliCore/GetDotenvCliOptions';
import type { AnyProcessEnv, DynamicMap } from '../GetDotenvOptions';

/**
 * Typed configuration shape for JS/TS configs.
 * Binds `vars`, `envVars`, and `dynamic` to a shared `Vars` type for strong inference.
 */
export type GetDotenvConfig<
  Vars extends AnyProcessEnv,
  Env extends string = string,
> = {
  dotenvToken?: string;
  privateToken?: string;
  paths?: string | string[];
  loadProcess?: boolean;
  log?: boolean;
  shell?: string | boolean;
  scripts?: Scripts;
  requiredKeys?: string[];
  schema?: unknown;
  vars?: Vars;
  envVars?: Record<Env, Partial<Vars>> | Readonly<Record<Env, Partial<Vars>>>;
  dynamic?: DynamicMap<Vars>;
  plugins?: Record<string, unknown>;
};

/**
 * Helper to define a get-dotenv config with strong type inference.
 *
 * @example
 * export default defineGetDotenvConfig<Vars>(\{
 *   vars: \{ APP_SETTING: 'val' \},
 *   dynamic: \{ KEY: (\{ APP_SETTING \}) =\> APP_SETTING \}
 * \});
 */
export function defineGetDotenvConfig<
  Vars extends AnyProcessEnv,
  Env extends string = string,
  T extends GetDotenvConfig<Vars, Env> = GetDotenvConfig<Vars, Env>,
>(cfg: T): T {
  return cfg;
}
