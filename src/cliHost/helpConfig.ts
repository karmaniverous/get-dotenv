import type { GetDotenvCliOptions } from './GetDotenvCliOptions';
import type { RootOptionsShape } from './types';

/**
 * Configuration context used for generating dynamic help descriptions.
 * Contains merged CLI options and plugin configuration slices.
 *
 * @public
 */
export type ResolvedHelpConfig = Partial<GetDotenvCliOptions> & {
  plugins: Record<string, unknown>;
};

/**
 * Build a help-time configuration bag for dynamic option descriptions.
 * Centralizes construction and reduces inline casts at call sites.
 */
export const toHelpConfig = (
  merged: Partial<GetDotenvCliOptions> | Partial<RootOptionsShape>,
  plugins: Record<string, unknown> | undefined,
): ResolvedHelpConfig => {
  return {
    ...(merged as Partial<GetDotenvCliOptions>),
    plugins: plugins ?? {},
  };
};
