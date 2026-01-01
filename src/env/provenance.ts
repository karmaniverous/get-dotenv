/**
 * Dotenv provenance model (descriptor-only).
 *
 * Requirements addressed:
 * - Host ctx carries a dotenv provenance mapping describing per-key origin and override history.
 * - Provenance is descriptor-only (no value payloads).
 * - Provenance is an ordered stack per key in ascending precedence; the last entry is effective.
 * - Explicit unsets are represented as `op: 'unset'` without requiring deletion of keys from the env map.
 */

/**
 * Provenance kind for an entry in {@link DotenvProvenance}.
 *
 * @public
 */
export type DotenvProvenanceKind = 'file' | 'config' | 'vars' | 'dynamic';

/**
 * Operation represented by a provenance entry.
 *
 * @public
 */
export type DotenvProvenanceOp = 'set' | 'unset';

/**
 * Base shape for all provenance entries.
 *
 * @public
 */
export interface DotenvProvenanceEntryBase {
  /**
   * The kind of provenance entry.
   */
  kind: DotenvProvenanceKind;
  /**
   * The operation applied at this layer.
   */
  op: DotenvProvenanceOp;
}

/**
 * Provenance entry representing a value sourced from a dotenv file in the cascade.
 *
 * @public
 */
export interface DotenvFileProvenanceEntry extends DotenvProvenanceEntryBase {
  /** Discriminator. */
  kind: 'file';
  /** Global vs env-scoped file. */
  scope: 'global' | 'env';
  /** Public vs private file. */
  privacy: 'public' | 'private';
  /** Environment name (required when scope is `env`). */
  env?: string;
  /**
   * The corresponding `paths[]` entry as provided by the caller/CLI.
   * This is not an absolute path by policy.
   */
  path: string;
  /**
   * The computed dotenv filename token (e.g., `.env`, `.env.dev`, `.env.local`, `.env.dev.local`).
   */
  file: string;
}

/**
 * Provenance entry representing a value sourced from config overlays (`vars` / `envVars`).
 *
 * @public
 */
export interface DotenvConfigProvenanceEntry extends DotenvProvenanceEntryBase {
  /** Discriminator. */
  kind: 'config';
  /** Global vs env-scoped config slice. */
  scope: 'global' | 'env';
  /** Public vs private on the privacy axis (`local` config maps to `private`). */
  privacy: 'public' | 'private';
  /** Environment name (required when scope is `env`). */
  env?: string;
  /** Packaged vs project config origin. */
  configScope: 'packaged' | 'project';
  /** Public vs local config file. */
  configPrivacy: 'public' | 'local';
}

/**
 * Provenance entry representing explicit variables overrides.
 *
 * Notes:
 * - This kind represents values injected via `vars` (CLI/programmatic), not dotenv files.
 *
 * @public
 */
export interface DotenvVarsProvenanceEntry extends DotenvProvenanceEntryBase {
  /** Discriminator. */
  kind: 'vars';
}

/**
 * Source tier for dynamic variables.
 *
 * @public
 */
export type DotenvDynamicSource = 'config' | 'programmatic' | 'dynamicPath';

/**
 * Provenance entry representing dynamic variables.
 *
 * @public
 */
export interface DotenvDynamicProvenanceEntry extends DotenvProvenanceEntryBase {
  /** Discriminator. */
  kind: 'dynamic';
  /** Dynamic source tier. */
  dynamicSource: DotenvDynamicSource;
  /**
   * The `dynamicPath` value as provided by the caller/CLI when `dynamicSource` is `dynamicPath`.
   * This is not resolved to an absolute path by provenance policy.
   */
  dynamicPath?: string;
}

/**
 * Union of all supported provenance entry shapes.
 *
 * @public
 */
export type DotenvProvenanceEntry =
  | DotenvFileProvenanceEntry
  | DotenvConfigProvenanceEntry
  | DotenvVarsProvenanceEntry
  | DotenvDynamicProvenanceEntry;

/**
 * Per-key provenance history.
 *
 * Each key maps to an array of entries ordered in ascending precedence (lower to higher).
 *
 * @public
 */
export type DotenvProvenance = Record<string, DotenvProvenanceEntry[]>;

/**
 * Create an empty provenance map.
 *
 * @public
 */
export function createDotenvProvenance(): DotenvProvenance {
  return {};
}

/**
 * Append a provenance entry for a key.
 *
 * @param prov - Provenance map to mutate.
 * @param key - Variable name.
 * @param entry - Descriptor-only provenance entry.
 *
 * @public
 */
export function pushDotenvProvenance(
  prov: DotenvProvenance,
  key: string,
  entry: DotenvProvenanceEntry,
): void {
  (prov[key] ??= []).push(entry);
}
