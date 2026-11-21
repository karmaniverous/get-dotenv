// src/GetDotenvOptions.ts
/**
 * Canonical programmatic options and helpers for get-dotenv.
 *
 * Requirements addressed:
 * - GetDotenvOptions derives from the Zod schema output (single source of truth).
 * - Removed deprecated/compat flags from the public shape (e.g., useConfigLoader).
 * - Provide Vars-aware defineDynamic and a typed config builder defineGetDotenvConfig\<Vars, Env\>().
 * - Preserve existing behavior for defaults resolution and compat converters.
 */
import { shake } from 'radash';
import type { z } from 'zod';

import type {
  RootOptionsShape,
  ScriptsTable as Scripts,
} from '@/src/cliHost/types';
import {
  baseRootOptionDefaults,
  withBuiltInEntropyWhitelist,
} from '@/src/defaults';
import type { getDotenvOptionsSchemaResolved } from '@/src/schema';
import { defaultsDeep } from '@/src/util';

/**
 * Standard filename for a get‑dotenv configuration file discovered by the
 * loaders. This is provided as a convenience for tests and tooling and does
 * not affect discovery precedence (JSON/YAML/JS/TS are supported).
 */
export const getDotenvOptionsFilename = 'getdotenv.config.json';

/**
 * A minimal representation of an environment key/value mapping.
 * Values may be `undefined` to represent "unset".
 */
export type ProcessEnv = Record<string, string | undefined>;

/**
 * Compatibility shape for root options allowing string inputs for vars/paths.
 * Used during CLI argument parsing before normalization.
 */
export type RootOptionsShapeCompat = Omit<
  RootOptionsShape,
  'vars' | 'paths'
> & {
  /**
   * Extra variables as either a space‑delimited string of assignments
   * (e.g., `"FOO=1 BAR=2"`; each pair is split at its first assignor, so
   * `"A=b=c"` sets `A` to `b=c`) or an object map of `string | undefined`
   * values.
   */
  vars?: string | ProcessEnv;
  /**
   * Dotenv search paths as a space‑delimited string or a pre‑split string[].
   */
  paths?: string | string[];
};

/**
 * Dynamic variable function signature. Receives the current expanded variables
 * and the selected environment (if any), and returns either a string to set
 * or `undefined` to unset/skip the variable.
 */
export type GetDotenvDynamicFunction = (
  vars: ProcessEnv,
  env: string | undefined,
) => string | null | undefined;

/**
 * A map of dynamic variable definitions.
 * Keys are variable names; values are either literal strings or functions.
 */
export type GetDotenvDynamic = Record<
  string,
  GetDotenvDynamicFunction | ReturnType<GetDotenvDynamicFunction>
>;

/**
 * Logger interface compatible with AWS SDK v3 expectations (`debug`, `info`, `warn`, `error`).
 * Consumers must provide an object that implements these four methods.
 * Additional methods (like `log`) are allowed but not required or used by this library.
 */
export type Logger = Pick<Console, 'debug' | 'info' | 'warn' | 'error'>;

/**
 * Validate that a candidate object satisfies the {@link Logger} contract.
 * Throws if the candidate is invalid.
 */
export const assertLogger = (candidate: unknown): Logger => {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('logger must be an object');
  }
  const l = candidate as Partial<Logger>;
  if (
    typeof l.debug !== 'function' ||
    typeof l.info !== 'function' ||
    typeof l.warn !== 'function' ||
    typeof l.error !== 'function'
  ) {
    throw new Error(
      'logger must implement debug, info, warn, and error methods',
    );
  }
  return l as Logger;
};

/**
 * Canonical programmatic options type (schema-derived).
 * This type is the single source of truth for programmatic options.
 */
export type GetDotenvOptions = Omit<
  z.output<typeof getDotenvOptionsSchemaResolved>,
  'logger' | 'dynamic'
> & {
  /**
   * Compile-time overlay: narrowed logger for DX (schema stores unknown).
   */
  logger: Logger;
  /**
   * Compile-time overlay: narrowed dynamic map for DX (schema stores unknown).
   */
  dynamic?: GetDotenvDynamic;
};

/**
 * Vars-aware dynamic helpers (compile-time DX).
 * DynamicFn: receive the current expanded variables and optional env.
 */
export type DynamicFn<Vars extends ProcessEnv> = (
  vars: Vars,
  env?: string,
) => string | null | undefined;

/**
 * Vars-aware dynamic map type used by {@link defineDynamic} and JS/TS configs.
 *
 * @typeParam Vars - The env var bag shape passed to dynamic functions.
 */
export type DynamicMap<Vars extends ProcessEnv> = Record<
  string,
  DynamicFn<Vars> | ReturnType<DynamicFn<Vars>>
>;

/**
 * Helper to define a dynamic map with strong inference (Vars-aware).
 *
 * Overload A (preferred): bind Vars to your intended key set for improved inference.
 */

export function defineDynamic<
  Vars extends ProcessEnv,
  T extends DynamicMap<Vars>,
>(d: T): T;

/**
 * Overload B (backward-compatible): generic over legacy GetDotenvDynamic.
 *
 * Accepts legacy GetDotenvDynamic without Vars binding.
 */
export function defineDynamic<T extends GetDotenvDynamic>(d: T): T;
export function defineDynamic(d: unknown): unknown {
  return d;
}

/**
 * Typed config shape and builder for authoring JS/TS getdotenv config files.
 *
 * Compile-time only; the runtime loader remains schema-driven. The keys are
 * exactly the loader's (see `getDotenvConfigSchemaRaw`): root operational
 * options such as `paths`, `shell` or `log` belong under
 * `rootOptionDefaults`.
 */
export interface GetDotenvConfig<
  Vars extends ProcessEnv,
  Env extends string = string,
> {
  /**
   * Operational root defaults applied by the host (collapsed families; stringly form).
   */
  rootOptionDefaults?: Partial<RootOptionsShape>;
  /** Help-time visibility for root flags (`false` hides). */
  rootOptionVisibility?: Partial<Record<keyof RootOptionsShape, boolean>>;
  /** Scripts table. */
  scripts?: Scripts;
  /** Keys required to be present in the final environment. */
  requiredKeys?: string[];
  /** Validation schema (e.g. Zod). */
  schema?: unknown;
  /** Global variables. */
  vars?: Vars;
  /** Environment-specific variables. */
  envVars?: Record<Env, Partial<Vars>>;
  /** Dynamic variable definitions. */
  dynamic?: DynamicMap<Vars>;
  /** Plugin configuration slices. */
  plugins?: Record<string, unknown>;
}

/**
 * Constrains a Zod schema type `S` to one whose *input* type (the shape Zod
 * expects before parsing/coercion) is `ProcessEnv`-compatible: every property
 * is `string | undefined` (optional allowed). Resolves to `never` otherwise,
 * which {@link defineGetDotenvConfig}'s schema-driven overload uses to reject
 * non-string-input schemas at compile time (e.g. a bare `z.coerce.number()`
 * leaf whose *input* is `unknown`, or a schema with a non-string property).
 *
 * @typeParam S - The candidate Zod schema type.
 */
export type ProcessEnvZodSchema<S extends z.ZodType> =
  z.input<S> extends ProcessEnv ? S : never;

/**
 * Clamp an arbitrary type to {@link ProcessEnv}, falling back to the empty
 * `ProcessEnv` shape when it doesn't already conform. Used to keep
 * `GetDotenvConfig<Vars, Env>`'s `Vars extends ProcessEnv` constraint
 * satisfied while a schema-driven `Vars` is still being checked for
 * string-valued input (see {@link ProcessEnvZodSchema}); the real
 * constraint enforcement happens via the overload's parameter type, not here.
 *
 * @typeParam V - The candidate `Vars` shape.
 */
export type AsProcessEnv<V> = V extends ProcessEnv ? V : ProcessEnv;

/**
 * Define a strongly‑typed get‑dotenv configuration document for JS/TS authoring.
 *
 * This helper is compile‑time only: it returns the input unchanged at runtime,
 * but enables rich TypeScript inference for `vars`, `envVars`, and `dynamic`,
 * and validates property names and value shapes as you author the config.
 *
 * **Schema-driven overload (preferred):** when `cfg.schema` is a Zod schema,
 * `Vars` is inferred from the schema's *input* type (`z.input<S>`) instead of
 * an explicit type parameter, so `dynamic` function parameters need no `Vars`
 * annotation. The schema's input must be string-valued (`ProcessEnv`-
 * compatible, optional allowed); a schema that coerces from a non-string
 * input is a type error. See {@link ProcessEnvZodSchema}.
 *
 * **Legacy overload:** `defineGetDotenvConfig<Vars, Env>()` keeps compiling
 * unchanged for configs that declare `Vars` explicitly (with or without a
 * `schema`, including a non-Zod validator that merely exposes `safeParse`).
 *
 * @typeParam S - The config's Zod schema type (schema-driven overload only).
 *   Inferred from `cfg.schema`; do not supply explicitly.
 * @typeParam Env - Allowed environment names used for `envVars` (defaults to `string`).
 * @param cfg - The configuration object literal.
 * @returns The same `cfg` value, with its type preserved for inference.
 */
export function defineGetDotenvConfig<
  S extends z.ZodType,
  Env extends string = string,
>(
  cfg: Omit<GetDotenvConfig<AsProcessEnv<z.input<S>>, Env>, 'schema'> & {
    /** The config's Zod object schema; `Vars` is inferred from its input type. */
    schema: S;
    /** Dynamic variable definitions, typed from `schema`'s input (no `Vars` param). */
    dynamic?: DynamicMap<AsProcessEnv<z.input<S>>>;
  } & (z.input<S> extends ProcessEnv ? unknown : { schema: never }),
): Omit<GetDotenvConfig<AsProcessEnv<z.input<S>>, Env>, 'schema'> & {
  /** The config's Zod object schema, unchanged. */
  schema: S;
};

/**
 * Legacy overload: see {@link defineGetDotenvConfig}'s main documentation.
 *
 * @typeParam Vars - The string‑valued env map your project uses (for example,
 *   `{ APP_SETTING?: string }`). Keys propagate to `dynamic` function arguments.
 * @typeParam Env - Allowed environment names used for `envVars` (defaults to `string`).
 * @typeParam T - The full config type being produced (defaults to `GetDotenvConfig<Vars, Env>`).
 *   This type parameter is rarely supplied explicitly.
 * @param cfg - The configuration object literal.
 * @returns The same `cfg` value, with its type preserved for inference.
 */
export function defineGetDotenvConfig<
  Vars extends ProcessEnv,
  Env extends string = string,
  T extends GetDotenvConfig<Vars, Env> = GetDotenvConfig<Vars, Env>,
>(
  cfg: T &
    (T extends { schema: infer TS extends z.ZodType }
      ? { schema: ProcessEnvZodSchema<TS> }
      : unknown),
): T;
export function defineGetDotenvConfig(cfg: unknown): unknown {
  return cfg;
}

/**
 * Internal helper type used by {@link InferGetDotenvVarsFromConfig}.
 *
 * This exists to give TypeDoc a stable symbol for the `vars` probe used in the
 * conditional type, avoiding anonymous `__type` warnings.
 *
 * @typeParam V - The `vars` bag shape declared on the config.
 */
export interface GetDotenvConfigWithVars<V extends ProcessEnv = ProcessEnv> {
  /**
   * Variables declared on a typed getdotenv config document.
   */
  vars?: V;
}

/**
 * Compile-time helper to derive the Vars shape from a typed getdotenv config document.
 */
export type InferGetDotenvVarsFromConfig<T> =
  T extends GetDotenvConfigWithVars<infer V>
    ? V extends ProcessEnv
      ? V
      : never
    : never;
/** CLI values arrive as strings: keep finite numbers, drop anything else. */
const toFiniteNumber = (value: unknown): number | undefined => {
  const n =
    typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
};

/** Split a delimited string by a regex pattern, a delimiter or a space. */
const splitBy = (
  value?: string,
  delim?: string,
  pattern?: string,
): string[] => {
  if (!value) return [];
  if (pattern) return value.split(RegExp(pattern));
  if (typeof delim === 'string') return value.split(delim);
  return value.split(' ');
};

/** How a `--vars` string is split into pairs and each pair into a key and value. */
interface VarsSyntax {
  varsAssignor?: string | undefined;
  varsAssignorPattern?: string | undefined;
  varsDelimiter?: string | undefined;
  varsDelimiterPattern?: string | undefined;
}

/**
 * Split one pair at its first assignor only, so the value may contain it.
 * A pair without an assignor yields no value (and is dropped later).
 */
const splitPair = (
  pair: string,
  { varsAssignor, varsAssignorPattern }: VarsSyntax,
): [string, string | undefined] => {
  let found: [number, number] | undefined;
  if (varsAssignorPattern) {
    const m = RegExp(varsAssignorPattern).exec(pair);
    found = m ? [m.index, m[0].length] : undefined;
  } else {
    const assignor = varsAssignor ?? '=';
    const at = pair.indexOf(assignor);
    found = at === -1 ? undefined : [at, assignor.length];
  }
  if (!found) return [pair, undefined];
  const [at, length] = found;
  return [pair.slice(0, at), pair.slice(at + length)];
};

/**
 * Vars as either a CLI string (`A=1 B=2`) or an object map, with
 * undefined-valued entries dropped.
 */
const parseVars = (
  vars: unknown,
  syntax: VarsSyntax,
): ProcessEnv | undefined => {
  let parsed: ProcessEnv | undefined;
  if (typeof vars === 'string') {
    const kvPairs = splitBy(
      vars,
      syntax.varsDelimiter,
      syntax.varsDelimiterPattern,
    )
      .map((pair) => splitPair(pair, syntax))
      .filter(([k]) => k.length > 0);
    parsed = Object.fromEntries(kvPairs);
  } else if (vars && typeof vars === 'object' && !Array.isArray(vars)) {
    parsed = Object.fromEntries(Object.entries(vars));
  }
  // Drop undefined-valued entries to match ProcessEnv expectations.
  return parsed ? shake(parsed, (v) => v === undefined) : undefined;
};

/**
 * Converts programmatic CLI options to `getDotenv` options.
 *
 * Accepts "stringly" CLI inputs for vars/paths and normalizes them into
 * the programmatic shape. Preserves exactOptionalPropertyTypes semantics by
 * omitting keys when undefined.
 */
export const getDotenvCliOptions2Options = ({
  paths,
  pathsDelimiter,
  pathsDelimiterPattern,
  vars,
  varsAssignor,
  varsAssignorPattern,
  varsDelimiter,
  varsDelimiterPattern,
  entropyThreshold,
  entropyMinLength,
  // drop CLI-only keys from the pass-through bag
  debug: _debug,
  scripts: _scripts,
  ...rest
}: RootOptionsShapeCompat): GetDotenvOptions => {
  const threshold = toFiniteNumber(entropyThreshold);
  const minLength = toFiniteNumber(entropyMinLength);
  const parsedVars = parseVars(vars, {
    varsAssignor,
    varsAssignorPattern,
    varsDelimiter,
    varsDelimiterPattern,
  });

  // Tolerate paths as either a delimited string or string[]
  const pathsOut = Array.isArray(paths)
    ? paths.filter((p): p is string => typeof p === 'string')
    : splitBy(paths, pathsDelimiter, pathsDelimiterPattern);

  // Preserve exactOptionalPropertyTypes: only include keys when defined.
  return {
    // Ensure the required logger property is present. The base CLI defaults
    // specify console as the logger; callers can override upstream if desired.
    logger: console,
    ...(rest as Partial<GetDotenvOptions>),
    ...(pathsOut.length > 0 ? { paths: pathsOut } : {}),
    ...(parsedVars !== undefined ? { vars: parsedVars } : {}),
    ...(threshold !== undefined ? { entropyThreshold: threshold } : {}),
    ...(minLength !== undefined ? { entropyMinLength: minLength } : {}),
  };
};

/**
 * Resolve {@link GetDotenvOptions} by layering defaults in ascending precedence:
 *
 * 1. Base defaults derived from the CLI generator defaults
 *    (`baseGetDotenvCliOptions`).
 * 2. Local project overrides from a `getdotenv.config.json` in the nearest
 *    package root (if present).
 * 3. The provided customOptions.
 *
 * The result preserves explicit empty values and drops only `undefined`.
 */
export const resolveGetDotenvOptions = (
  customOptions: Partial<GetDotenvOptions>,
): Promise<GetDotenvOptions> => {
  // Programmatic callers use neutral defaults only. Do not read local packaged
  // getdotenv.config.json here; the host path applies packaged/project configs
  // via the dedicated loader/overlay pipeline.
  // `loadProcess` defaults on for the CLI only (#48): the host passes its
  // resolved value explicitly, and library callers opt in.
  const { loadProcess: _cliOnly, ...mergedDefaults } =
    baseRootOptionDefaults as Partial<RootOptionsShape>;

  const defaultsFromCli = getDotenvCliOptions2Options(mergedDefaults);

  const result = defaultsDeep(defaultsFromCli, customOptions);

  // Validate the logger (defaults to console if missing/merged).
  // We use the merged result, so if the user didn't provide one, we get the default (console).
  const validatedLogger = assertLogger(result.logger);

  return Promise.resolve({
    ...result,
    // A caller's entropy whitelist extends the built-in one (#46).
    entropyWhitelist: withBuiltInEntropyWhitelist(result.entropyWhitelist),
    logger: validatedLogger,
    vars: shake(result.vars ?? {}, (v) => v === undefined) as ProcessEnv,
  });
};
