/** src/cliHost/readPluginConfig.ts
 * Typed accessor for a plugin's config slice stored on the host context.
 * Runtime is a thin cast; validation remains governed by a plugin's schema
 * (when provided) in the host pipeline.
 */
import type { GetDotenvCliPublic } from './definePlugin';

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- DX: typed accessor; generic exists for downstream inference without burdensome casts
export function readPluginConfig<T>(
  cli: GetDotenvCliPublic,
  id: string,
): T | undefined {
  // Host guarantees getCtx exists when plugins execute; keep slice optional.
  const cfg = cli.getCtx().pluginConfigs?.[id];
  // Cast-only; return undefined when slice is absent.
  return (cfg as T) ?? undefined;
}
