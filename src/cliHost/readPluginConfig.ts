/** src/cliHost/readPluginConfig.ts
 * Typed accessor for a plugin's config slice stored on the host context.
 * Runtime is a thin cast; validation remains governed by a plugin's schema
 * (when provided) in the host pipeline.
 */
import type { GetDotenvCliPublic } from './definePlugin';

export function readPluginConfig<T>(
  cli: GetDotenvCliPublic,
  id: string,
): T | undefined {
  const cfg = cli.getCtx?.()?.pluginConfigs?.[id];
  // Cast-only; return undefined when slice is absent.
  return (cfg as T) ?? undefined;
}
