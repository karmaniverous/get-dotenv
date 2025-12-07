/** src/cliHost/resolveAndComputeContext.ts
 * Resolve options strictly and compute the dotenv context via the loader/overlay path.
 */
import { computeContext } from '@/src/cliHost/computeContext';
import type { GetDotenvCliPlugin } from '@/src/cliHost/definePlugin';
import type { GetDotenvCliCtx } from '@/src/cliHost/GetDotEnvCli';
import {
  type GetDotenvOptions,
  resolveGetDotenvOptions,
} from '@/src/GetDotenvOptions';
import { getDotenvOptionsSchemaResolved } from '@/src/schema/getDotenvOptions';

export async function resolveAndComputeContext<
  TOptions extends GetDotenvOptions,
>(
  customOptions: Partial<TOptions>,
  plugins: GetDotenvCliPlugin<TOptions>[],
  hostMetaUrl: string,
): Promise<GetDotenvCliCtx<TOptions>> {
  const optionsResolved = await resolveGetDotenvOptions(
    customOptions as Partial<GetDotenvOptions>,
  );
  // Strict schema validation
  getDotenvOptionsSchemaResolved.parse(optionsResolved);

  const ctx = await computeContext<TOptions>(
    optionsResolved as Partial<TOptions>,
    plugins,
    hostMetaUrl,
  );
  return ctx;
}
