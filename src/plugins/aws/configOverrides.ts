import { isObject } from 'radash';

import type { GetDotenvCliPublic } from '@/src/cliHost';

import type { AwsPlugin } from '.';
import type { AwsPluginConfig } from './types';

/**
 * The effective AWS plugin config for one invocation: the discovered
 * `plugins.aws` config slice with the `aws` flags of this invocation over it
 * (flags beat config).
 *
 * @param plugin - The AWS plugin instance (reads its config slice).
 * @param cli - Any command of the host (the config is per plugin instance).
 * @param opts - Commander option values of the `aws` mount.
 * @returns The config to resolve the session with.
 *
 * @internal
 */
export function awsConfigWithFlags(
  plugin: AwsPlugin,
  cli: GetDotenvCliPublic,
  opts: unknown,
): AwsPluginConfig {
  return {
    ...plugin.readConfig(cli),
    ...awsConfigOverridesFromCommandOpts(opts),
  };
}

/** @internal */
const isRecord = (v: unknown): v is Record<string, unknown> => {
  return isObject(v) && !Array.isArray(v);
};

/**
 * Create an AWS plugin config overlay from Commander-parsed option values.
 *
 * This preserves tri-state intent:
 * - If a flag was not provided, it should not overwrite config-derived defaults.
 * - If `--no-…` was provided, it must explicitly force the boolean false.
 *
 * @param opts - Commander option values for the current invocation.
 * @returns A partial AWS plugin config object containing only explicit overrides.
 *
 * @internal
 */
export function awsConfigOverridesFromCommandOpts(
  opts: unknown,
): Partial<AwsPluginConfig> {
  const o = isRecord(opts) ? opts : {};
  const overlay: Partial<AwsPluginConfig> = {};

  // Map boolean toggles (respect explicit --no-*)
  if (Object.prototype.hasOwnProperty.call(o, 'loginOnDemand')) {
    overlay.loginOnDemand = Boolean(o.loginOnDemand);
  }

  // Strings/enums
  if (typeof o.profile === 'string') overlay.profile = o.profile;
  if (typeof o.region === 'string') overlay.region = o.region;
  if (typeof o.defaultRegion === 'string')
    overlay.defaultRegion = o.defaultRegion;
  if (o.strategy === 'cli-export' || o.strategy === 'none') {
    overlay.strategy = o.strategy;
  }

  // Advanced key overrides
  if (typeof o.profileKey === 'string') overlay.profileKey = o.profileKey;
  if (typeof o.profileFallbackKey === 'string') {
    overlay.profileFallbackKey = o.profileFallbackKey;
  }
  if (typeof o.regionKey === 'string') overlay.regionKey = o.regionKey;

  return overlay;
}
