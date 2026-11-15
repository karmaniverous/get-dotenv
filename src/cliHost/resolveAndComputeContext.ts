import type { OptionValues } from '@commander-js/extra-typings';

import { type GetDotenvOptions, resolveGetDotenvOptions } from '@/src/core';
import { getDotenvOptionsSchemaResolved } from '@/src/schema';

import { computeContext } from './computeContext';
import type { PluginChildEntry } from './contracts';
import type { GetDotenvCliCtx } from './types';

/**
 * Resolve options strictly and compute the dotenv context via the loader/overlay path.
 *
 * @param customOptions - Partial options overlay.
 * @param plugins - Registered plugin entries (plugin + namespace override),
 *   for config keying and validation by realized mount path.
 * @param hostMetaUrl - Import URL for resolving the packaged root.
 */
export async function resolveAndComputeContext<
  TOptions extends GetDotenvOptions,
  TArgs extends unknown[] = [],
  TOpts extends OptionValues = {},
  TGlobal extends OptionValues = {},
>(
  customOptions: Partial<TOptions>,
  plugins: ReadonlyArray<PluginChildEntry<TOptions, TArgs, TOpts, TGlobal>>,
  hostMetaUrl: string,
): Promise<GetDotenvCliCtx<TOptions>> {
  const optionsResolved = await resolveGetDotenvOptions(customOptions);
  // Strict schema validation
  getDotenvOptionsSchemaResolved.parse(optionsResolved);

  const ctx = await computeContext<TOptions, TArgs, TOpts, TGlobal>(
    optionsResolved as Partial<TOptions>,
    plugins,
    hostMetaUrl,
  );
  return ctx;
}
