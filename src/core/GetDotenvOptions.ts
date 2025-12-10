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
import fs from 'fs-extra';
import { packageDirectory } from 'package-directory';
import { join } from 'path';
import type { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { baseGetDotenvCliOptions } from '@/src/cliHost';
import type {
  RootOptionsShape,
  ScriptsTable as Scripts,
} from '@/src/cliHost/types';
import { baseRootOptionDefaults } from '@/src/defaults';
import type { getDotenvOptionsSchemaResolved } from '@/src/schema';
import { defaultsDeep, omitUndefinedRecord } from '@/src/util';

export const getDotenvOptionsFilename = 'getdotenv.config.json';

// Compat: widen CLI-facing shapes at the converter boundary so projects that
// provide data-style config can pass vars as a map and paths as string[].
export type RootOptionsShapeCompat = Omit<
  RootOptionsShape,
  'vars' | 'paths'
> & {
  vars?: string | Record<string, string | undefined>;
  paths?: string | string[];
};

/**
 * A minimal representation of an environment key/value mapping.
 * Values may be `undefined` to represent "unset".
 */
export type ProcessEnv = Record<string, string | undefined>;

/**
 * Dynamic variable function signature. Receives the current expanded variables
 * and the selected environment (if any), and returns either a string to set
 * or `undefined` to unset/skip the variable.
 */
export type GetDotenvDynamicFunction = (
  vars: ProcessEnv,
  env: string | undefined,
) => string | undefined;
export type GetDotenvDynamic = Record<
  string,
  GetDotenvDynamicFunction | ReturnType<GetDotenvDynamicFunction>
>;
export type Logger =
  | Record<string, (...args: unknown[]) => void>
  | typeof console;

/**
 * Canonical programmatic options type (schema-derived).
 * This type is the single source of truth for programmatic options.
 */
export type GetDotenvOptions = z.output<
  typeof getDotenvOptionsSchemaResolved
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
export type DynamicFn<Vars extends Record<string, string | undefined>> = (
  vars: Vars,
  env?: string,
) => string | undefined;

export type DynamicMap<Vars extends Record<string, string | undefined>> =
  Record<string, DynamicFn<Vars> | ReturnType<DynamicFn<Vars>>>;

/**
 * Helper to define a dynamic map with strong inference (Vars-aware).
 *
 * Overload A (preferred): bind Vars to your intended key set for improved inference.
 */

export function defineDynamic<
  Vars extends Record<string, string | undefined>,
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
 * Compile-time only; the runtime loader remains schema-driven.
 */
export type GetDotenvConfig<
  Vars extends ProcessEnv,
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
  envVars?: Record<Env, Partial<Vars>>;
  dynamic?: DynamicMap<Vars>;
  plugins?: Record<string, unknown>;
};

export function defineGetDotenvConfig<
  Vars extends ProcessEnv,
  Env extends string = string,
  T extends GetDotenvConfig<Vars, Env> = GetDotenvConfig<Vars, Env>,
>(cfg: T): T {
  return cfg;
}

/**
 * Compile-time helper to derive the Vars shape from a typed getdotenv config document.
 */
export type InferGetDotenvVarsFromConfig<T> = T extends {
  vars?: infer V;
}
  ? V extends Record<string, string | undefined>
    ? V
    : never
  : never;
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
  // drop CLI-only keys from the pass-through bag
  debug: _debug,
  scripts: _scripts,
  ...rest
}: RootOptionsShapeCompat): GetDotenvOptions => {
  // Split helper for delimited strings or regex patterns
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

  // Tolerate vars as either a CLI string ("A=1 B=2") or an object map.
  let parsedVars: ProcessEnv | undefined;
  if (typeof vars === 'string') {
    const kvPairs = splitBy(vars, varsDelimiter, varsDelimiterPattern)
      .map((v) =>
        v.split(
          varsAssignorPattern
            ? RegExp(varsAssignorPattern)
            : (varsAssignor ?? '='),
        ),
      )
      .filter(([k]) => typeof k === 'string' && k.length > 0) as Array<
      [string, string]
    >;
    parsedVars = Object.fromEntries(kvPairs);
  } else if (vars && typeof vars === 'object' && !Array.isArray(vars)) {
    // Accept provided object map of string | undefined; drop undefined values
    // in the normalization step below to produce a ProcessEnv-compatible bag.
    parsedVars = Object.fromEntries(Object.entries(vars));
  }

  // Drop undefined-valued entries at the converter stage to match ProcessEnv
  // expectations and the compat test assertions.
  if (parsedVars) {
    parsedVars = omitUndefinedRecord(parsedVars);
  }

  // Tolerate paths as either a delimited string or string[]
  const pathsOut = Array.isArray(paths)
    ? paths.filter((p): p is string => typeof p === 'string')
    : splitBy(paths, pathsDelimiter, pathsDelimiterPattern);

  // Preserve exactOptionalPropertyTypes: only include keys when defined.
  return {
    // Ensure the required logger property is present. The base CLI defaults
    // specify console as the logger; callers can override upstream if desired.
    logger: console as Logger,
    ...(rest as Partial<GetDotenvOptions>),
    ...(pathsOut.length > 0 ? { paths: pathsOut } : {}),
    ...(parsedVars !== undefined ? { vars: parsedVars } : {}),
  };
};

/**
 * Resolve {@link GetDotenvOptions} by layering defaults in ascending precedence:
 *
 * 1. Base defaults derived from the CLI generator defaults
 *    ({@link baseGetDotenvCliOptions}).
 * 2. Local project overrides from a `getdotenv.config.json` in the nearest
 *    package root (if present).
 * 3. The provided customOptions.
 *
 * The result preserves explicit empty values and drops only `undefined`.
 */
export const resolveGetDotenvOptions = async (
  customOptions: Partial<GetDotenvOptions>,
) => {
  const localPkgDir = await packageDirectory();

  const localOptionsPath = localPkgDir
    ? join(localPkgDir, getDotenvOptionsFilename)
    : undefined;

  // Safely read local CLI-facing defaults (defensive typing to satisfy strict linting).
  let localOptions: Partial<RootOptionsShape> = {};
  if (localOptionsPath && (await fs.exists(localOptionsPath))) {
    try {
      const txt = await fs.readFile(localOptionsPath, 'utf-8');
      const parsed = JSON.parse(txt) as unknown;
      if (parsed && typeof parsed === 'object') {
        localOptions = parsed as Partial<RootOptionsShape>;
      }
    } catch {
      // Malformed or unreadable local options are treated as absent.
      localOptions = {};
    }
  }

  // Merge order for defaults: base (neutral) < local (project)
  // Use neutral defaults to avoid a core -> cliHost back-edge at runtime.
  const mergedDefaults = defaultsDeep(
    baseRootOptionDefaults as Partial<RootOptionsShape>,
    localOptions,
  ) as Partial<RootOptionsShape>;

  const defaultsFromCli = getDotenvCliOptions2Options(
    mergedDefaults as unknown as RootOptionsShapeCompat,
  );

  const result = defaultsDeep(
    defaultsFromCli as Partial<GetDotenvOptions>,
    customOptions,
  );

  return {
    ...result, // Keep explicit empty strings/zeros; drop only undefined
    vars: omitUndefinedRecord(result.vars ?? {}),
  };
};
