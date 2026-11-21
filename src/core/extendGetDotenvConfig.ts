/**
 * `extendGetDotenvConfig`: compose a typed getdotenv config document from a
 * base config and an optional override slice (#96).
 *
 * See {@link extendGetDotenvConfig} for the merge semantics of each key.
 */
import type { util as zUtil } from 'zod';
import { z } from 'zod';

import { defaultsDeep } from '@/src/util';

import type {
  AsProcessEnv,
  DynamicMap,
  GetDotenvConfig,
  ProcessEnv,
} from './GetDotenvOptions';

/**
 * Internal helper type used by {@link InferConfigSchema}.
 *
 * This exists to give TypeDoc a stable symbol for the `schema` probe used in
 * the conditional type, avoiding anonymous `__type` warnings.
 *
 * @typeParam S - The `schema` value's type.
 */
export interface GetDotenvConfigWithSchema<S = unknown> {
  /**
   * The Zod schema (or any `safeParse`-shaped validator) declared on a
   * typed getdotenv config document.
   */
  schema?: S;
}

/**
 * Extracts the `schema` property type from a getdotenv config document type,
 * or `undefined` when the config declares no schema.
 *
 * @typeParam T - A getdotenv config document type (as produced by
 *   `defineGetDotenvConfig` or an object literal). Its (optional) `schema`
 *   property, if present, is the extracted type.
 */
export type InferConfigSchema<T> =
  T extends GetDotenvConfigWithSchema<infer S> ? S : undefined;

/**
 * Computes the merged `schema` type for {@link extendGetDotenvConfig}:
 *
 * - Neither side has a schema: `undefined`.
 * - Only one side has a schema: that side's schema type, unchanged.
 * - Both sides are Zod object schemas: the base schema extended with the
 *   override's shape (override wins on a clashing key), matching
 *   {@link https://zod.dev/api?id=extend | `ZodObject.extend`}'s own typing.
 * - Both sides have a schema but at least one isn't a Zod object schema: the
 *   type-level merge can't express it (schema merging requires Zod object
 *   schemas on both sides); the runtime throws in this case. See
 *   {@link extendGetDotenvConfig}.
 *
 * @typeParam BaseSchema - The base config's `schema` type (or `undefined`).
 * @typeParam OverrideSchema - The override's `schema` type (or `undefined`).
 */
export type MergedGetDotenvSchema<BaseSchema, OverrideSchema> =
  OverrideSchema extends undefined
    ? BaseSchema
    : BaseSchema extends undefined
      ? OverrideSchema
      : BaseSchema extends z.ZodObject<infer BShape, infer BConfig>
        ? OverrideSchema extends z.ZodObject<infer OShape, infer _OConfig>
          ? z.ZodObject<zUtil.Extend<BShape, OShape>, BConfig>
          : never
        : never;

/**
 * Computes the `Vars` bag seen by the merged config's `dynamic` functions:
 * the merged schema's input type when a merged schema exists, else the union
 * of the base and override `Vars` (for configs that don't use a schema).
 *
 * @typeParam BaseSchema - The base config's `schema` type (or `undefined`).
 * @typeParam OverrideSchema - The override's `schema` type (or `undefined`).
 * @typeParam BaseVars - The base config's declared `Vars` (legacy, no-schema path).
 * @typeParam OverrideVars - The override's declared `Vars` (legacy, no-schema path).
 */
export type MergedGetDotenvVars<
  BaseSchema,
  OverrideSchema,
  BaseVars extends ProcessEnv,
  OverrideVars extends ProcessEnv,
> =
  MergedGetDotenvSchema<BaseSchema, OverrideSchema> extends z.ZodType
    ? AsProcessEnv<z.input<MergedGetDotenvSchema<BaseSchema, OverrideSchema>>>
    : BaseVars & OverrideVars;

/**
 * Extend a base getdotenv config document with an override slice, returning
 * a new typed config. Neither `base` nor `overrides` is mutated (#96).
 *
 * Merge semantics, by key:
 *
 * | Key | Merge |
 * | --- | --- |
 * | `schema` | Base Zod object schema extended with the override's fields;
 *   override wins on a clash. Requires Zod object schemas when both sides
 *   have one (throws at runtime otherwise); either side alone passes
 *   through unchanged. |
 * | `dynamic` | Object spread: an overridden key keeps the base key's
 *   position (so values that depend on it are still computed after it);
 *   new keys come after all base keys. |
 * | `requiredKeys` | Union, base order first, de-duplicated. |
 * | `plugins`, `rootOptionDefaults`, `rootOptionVisibility`, `scripts`,
 *   `vars`, `envVars` (plain objects) | Deep merge, override wins (the
 *   internal `defaultsDeep` semantics). |
 * | Other arrays and scalars | Override replaces. |
 *
 * The override's `dynamic` functions are typed against the *merged*
 * schema's input, so they see both base and override variables. Calling
 * `extendGetDotenvConfig(base)` with no overrides returns an equivalent
 * config (a new object, structurally the same as `base`).
 *
 * @typeParam BaseVars - The base config's declared `Vars` (legacy, no-schema path).
 * @typeParam BaseEnv - The base config's declared `Env`.
 * @typeParam BaseSchema - The base config's `schema` type (or `undefined`).
 * @typeParam OverrideEnv - The override's declared `Env` (defaults to `BaseEnv`).
 * @typeParam OverrideSchema - The override's `schema` type (or `undefined`).
 * @param base - The base config to extend.
 * @param overrides - An optional override slice; `dynamic` functions here
 *   are typed with the merged schema's input (base and override variables
 *   alike).
 * @returns A new, typed config document with the merge semantics above applied.
 */
export function extendGetDotenvConfig<
  BaseVars extends ProcessEnv,
  BaseEnv extends string,
  BaseSchema = undefined,
  OverrideVars extends ProcessEnv = BaseVars,
  OverrideEnv extends string = BaseEnv,
  OverrideSchema = undefined,
>(
  base: Omit<GetDotenvConfig<BaseVars, BaseEnv>, 'schema'> & {
    /** The base config's Zod object schema (or any `safeParse`-shaped validator). */
    schema?: BaseSchema;
  },
  overrides?: Omit<
    GetDotenvConfig<
      MergedGetDotenvVars<BaseSchema, OverrideSchema, BaseVars, OverrideVars>,
      OverrideEnv
    >,
    'schema' | 'dynamic' | 'vars' | 'envVars'
  > & {
    /** Extends the base schema (override wins on a clash); see the merge table above. */
    schema?: OverrideSchema;
    dynamic?: DynamicMap<
      MergedGetDotenvVars<BaseSchema, OverrideSchema, BaseVars, OverrideVars>
    >;
    /** Deep-merged with the base's `vars` (override wins on a clash). */
    vars?: Partial<
      MergedGetDotenvVars<BaseSchema, OverrideSchema, BaseVars, OverrideVars>
    >;
    /** Deep-merged with the base's `envVars` (override wins on a clash). */
    envVars?: Record<
      OverrideEnv,
      Partial<
        MergedGetDotenvVars<BaseSchema, OverrideSchema, BaseVars, OverrideVars>
      >
    >;
  },
): Omit<
  GetDotenvConfig<
    MergedGetDotenvVars<BaseSchema, OverrideSchema, BaseVars, OverrideVars>,
    BaseEnv | OverrideEnv
  >,
  'schema'
> & {
  /** The merged schema; see the merge table above. */
  schema: MergedGetDotenvSchema<BaseSchema, OverrideSchema>;
} {
  const baseAny = base as Record<string, unknown>;
  const overridesAny = (overrides ?? {}) as Record<string, unknown>;

  // schema: Zod-object extend (override wins on clash); either side alone
  // passes through; both present but not Zod objects is a runtime error.
  const baseSchema = baseAny['schema'];
  const overrideSchema = overridesAny['schema'];
  const isZodObject = (v: unknown): v is z.ZodObject<z.ZodRawShape> =>
    v instanceof z.ZodObject;
  let mergedSchema: unknown;
  if (baseSchema === undefined) {
    mergedSchema = overrideSchema;
  } else if (overrideSchema === undefined) {
    mergedSchema = baseSchema;
  } else if (isZodObject(baseSchema) && isZodObject(overrideSchema)) {
    mergedSchema = baseSchema.extend(overrideSchema.shape);
  } else {
    throw new Error(
      'extendGetDotenvConfig: merging two schemas requires both to be Zod ' +
        'object schemas (z.object(...)); either side alone passes through.',
    );
  }

  // dynamic: object spread; an overridden key keeps its base position
  // (native JS object key-order semantics), new keys come after.
  const baseDynamic = baseAny['dynamic'] as Record<string, unknown> | undefined;
  const overrideDynamic = overridesAny['dynamic'] as
    Record<string, unknown> | undefined;
  const mergedDynamic =
    baseDynamic === undefined && overrideDynamic === undefined
      ? undefined
      : { ...(baseDynamic ?? {}), ...(overrideDynamic ?? {}) };

  // requiredKeys: union, base order first, de-duplicated.
  const baseRequiredKeys = baseAny['requiredKeys'] as string[] | undefined;
  const overrideRequiredKeys = overridesAny['requiredKeys'] as
    string[] | undefined;
  const mergedRequiredKeys =
    baseRequiredKeys === undefined && overrideRequiredKeys === undefined
      ? undefined
      : [
          ...new Set([
            ...(baseRequiredKeys ?? []),
            ...(overrideRequiredKeys ?? []),
          ]),
        ];

  // Everything else: deep merge, override wins (plain objects); arrays and
  // scalars replace. `defaultsDeep` never mutates its inputs.
  const {
    schema: _baseSchemaOmit,
    dynamic: _baseDynamicOmit,
    requiredKeys: _baseRequiredKeysOmit,
    ...baseRest
  } = baseAny;
  const {
    schema: _overrideSchemaOmit,
    dynamic: _overrideDynamicOmit,
    requiredKeys: _overrideRequiredKeysOmit,
    ...overrideRest
  } = overridesAny;
  const merged = defaultsDeep<Record<string, unknown>>(baseRest, overrideRest);

  if (mergedSchema !== undefined) merged['schema'] = mergedSchema;
  if (mergedDynamic !== undefined) merged['dynamic'] = mergedDynamic;
  if (mergedRequiredKeys !== undefined)
    merged['requiredKeys'] = mergedRequiredKeys;

  return merged as Omit<
    GetDotenvConfig<
      MergedGetDotenvVars<BaseSchema, OverrideSchema, BaseVars, OverrideVars>,
      BaseEnv | OverrideEnv
    >,
    'schema'
  > & { schema: MergedGetDotenvSchema<BaseSchema, OverrideSchema> };
}
