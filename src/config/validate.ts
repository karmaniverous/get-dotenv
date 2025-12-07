/** src/config/validate.ts */
import type { ProcessEnv } from '@/src/GetDotenvOptions';

import type { ResolvedConfigSources } from './loader';

/**
 * Validate a composed env against config-provided validation surfaces.
 * Precedence for validation definitions:
 *   project.local -\> project.public -\> packaged
 *
 * Behavior:
 * - If a JS/TS `schema` is present, use schema.safeParse(finalEnv).
 * - Else if `requiredKeys` is present, check presence (value !== undefined).
 * - Returns a flat list of issue strings; caller decides warn vs fail.
 */
export const validateEnvAgainstSources = (
  finalEnv: ProcessEnv,
  sources: ResolvedConfigSources,
): string[] => {
  const pick = <T>(
    getter: (cfg: Record<string, unknown>) => T | undefined,
  ): T | undefined => {
    const pl = sources.project?.local as Record<string, unknown> | undefined;
    const pp = sources.project?.public as Record<string, unknown> | undefined;
    const pk = sources.packaged as Record<string, unknown> | undefined;
    return (
      (pl && getter(pl)) ||
      (pp && getter(pp)) ||
      (pk && getter(pk)) ||
      undefined
    );
  };

  const schema = pick<unknown>((cfg) => cfg['schema']);
  if (
    schema &&
    typeof (schema as { safeParse?: unknown }).safeParse === 'function'
  ) {
    try {
      const parsed = (
        schema as {
          safeParse: (v: unknown) => { success: boolean; error?: unknown };
        }
      ).safeParse(finalEnv);
      if (!parsed.success) {
        // Try to render zod-style issues when available.
        const err = parsed.error as {
          issues?: Array<{ path?: (string | number)[]; message?: string }>;
        };
        const issues =
          Array.isArray(err.issues) && err.issues.length > 0
            ? err.issues.map((i) => {
                const path = Array.isArray(i.path) ? i.path.join('.') : '';
                const msg = i.message ?? 'Invalid value';
                return path ? `[schema] ${path}: ${msg}` : `[schema] ${msg}`;
              })
            : ['[schema] validation failed'];
        return issues;
      }
      return [];
    } catch {
      // If schema invocation fails, surface a single diagnostic.
      return [
        '[schema] validation failed (unable to execute schema.safeParse)',
      ];
    }
  }

  const requiredKeys = pick<string[]>(
    (cfg) => cfg['requiredKeys'] as string[] | undefined,
  );
  if (Array.isArray(requiredKeys) && requiredKeys.length > 0) {
    const missing = requiredKeys.filter((k) => finalEnv[k] === undefined);
    if (missing.length > 0) {
      return missing.map((k) => `[requiredKeys] missing: ${k}`);
    }
  }
  return [];
};
