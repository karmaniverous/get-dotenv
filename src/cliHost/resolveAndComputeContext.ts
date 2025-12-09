/** src/cliHost/resolveAndComputeContext.ts
 * Resolve options strictly and compute the dotenv context via the loader/overlay path.
 */
import type { OptionValues } from '@commander-js/extra-typings';

import { computeContext } from '@/src/cliHost/computeContext';
import type { GetDotenvCliPlugin } from '@/src/cliHost/definePlugin';
import type { GetDotenvCliCtx } from '@/src/cliHost/GetDotenvCli';
import {
  type GetDotenvOptions,
  resolveGetDotenvOptions,
} from '@/src/GetDotenvOptions';
import { getDotenvOptionsSchemaResolved } from '@/src/schema/getDotenvOptions';

export async function resolveAndComputeContext<
  TOptions extends GetDotenvOptions,
  TArgs extends unknown[] = [],
  TOpts extends OptionValues = {},
  TGlobal extends OptionValues = {},
>(
  customOptions: Partial<TOptions>,
  plugins: GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>[],
  hostMetaUrl: string,
): Promise<GetDotenvCliCtx<TOptions>> {
  const optionsResolved = await resolveGetDotenvOptions(
    customOptions as Partial<GetDotenvOptions>,
  );
  // Strict schema validation
  getDotenvOptionsSchemaResolved.parse(optionsResolved);

  const ctx = await computeContext<TOptions, TArgs, TOpts, TGlobal>(
    optionsResolved as Partial<TOptions>,
    plugins,
    hostMetaUrl,
  );
  return ctx;
}
