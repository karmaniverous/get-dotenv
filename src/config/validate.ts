import type { ProcessEnv } from '@/src/core';

import { configLayers } from './layers';
import type { ResolvedConfigSources } from './loader';

/** A Zod-like validator: anything exposing `safeParse`. */
interface SafeParseLike {
  safeParse: (v: unknown) => { success: boolean; error?: unknown };
}

const isSafeParseLike = (v: unknown): v is SafeParseLike =>
  !!v && typeof (v as { safeParse?: unknown }).safeParse === 'function';

/** Render a failed `safeParse` result's issues, falling back to a single line. */
const renderSchemaIssues = (error: unknown): string[] => {
  const err = error as {
    issues?: Array<{ path?: (string | number)[]; message?: string }>;
  };
  return Array.isArray(err.issues) && err.issues.length > 0
    ? err.issues.map((i) => {
        const path = Array.isArray(i.path) ? i.path.join('.') : '';
        const msg = i.message ?? 'Invalid value';
        return path ? `[schema] ${path}: ${msg}` : `[schema] ${msg}`;
      })
    : ['[schema] validation failed'];
};

/**
 * Validate a composed env against every config layer's validation surface
 * (#96): packaged, project public, and project local each contribute
 * independently, instead of one layer shadowing the others.
 *
 * Behavior, per layer (lowest precedence first: packaged, project public,
 * project local):
 * - If the layer declares a JS/TS `schema`, run `schema.safeParse(finalEnv)`
 *   and collect its issues; every layer with a schema is checked (a project
 *   schema no longer shadows the packaged layer's schema).
 * - Else if the layer declares `requiredKeys`, its keys join a union checked
 *   once against `finalEnv` after all layers are visited (base layer order
 *   first, de-duplicated).
 *
 * A config set that uses a single layer behaves exactly as before: that
 * layer's own `schema` (if present) is checked in place of its own
 * `requiredKeys`, matching the single-config precedent this validation
 * always followed.
 *
 * @param finalEnv - Final composed environment to validate.
 * @param sources - Resolved config sources providing `schema` and/or `requiredKeys`.
 * @returns A list of human-readable issue strings (empty when valid).
 */
export const validateEnvAgainstSources = (
  finalEnv: ProcessEnv,
  sources: ResolvedConfigSources,
): string[] => {
  const layers = configLayers(sources).filter(
    (l): l is NonNullable<(typeof sources)['packaged']> => l !== undefined,
  );

  const issues: string[] = [];
  const requiredKeysUnion: string[] = [];
  const seenRequiredKeys = new Set<string>();

  for (const layer of layers) {
    const cfg = layer as unknown as Record<string, unknown>;
    const schema = cfg['schema'];
    if (isSafeParseLike(schema)) {
      try {
        const parsed = schema.safeParse(finalEnv);
        if (!parsed.success) issues.push(...renderSchemaIssues(parsed.error));
      } catch {
        issues.push(
          '[schema] validation failed (unable to execute schema.safeParse)',
        );
      }
      // This layer's own schema supersedes its own requiredKeys, matching
      // the single-config precedent.
      continue;
    }

    const requiredKeys = cfg['requiredKeys'] as string[] | undefined;
    if (Array.isArray(requiredKeys)) {
      for (const key of requiredKeys) {
        if (seenRequiredKeys.has(key)) continue;
        seenRequiredKeys.add(key);
        requiredKeysUnion.push(key);
      }
    }
  }

  if (requiredKeysUnion.length > 0) {
    const missing = requiredKeysUnion.filter((k) => finalEnv[k] === undefined);
    issues.push(...missing.map((k) => `[requiredKeys] missing: ${k}`));
  }

  return issues;
};
