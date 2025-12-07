import type { GetDotenvCliOptions } from '../cliCore/GetDotenvCliOptions';
import type { ResolvedHelpConfig } from './GetDotenvCli';

/**
 * Build a help-time configuration bag for dynamic option descriptions.
 * Centralizes construction and reduces inline casts at call sites.
 */
export const toHelpConfig = (
  merged: Partial<GetDotenvCliOptions>,
  plugins: Record<string, unknown> | undefined,
): ResolvedHelpConfig => {
  return { ...merged, plugins: plugins ?? {} };
};
