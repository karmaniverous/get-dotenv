/**
 * The root options stack (spec 3.3.1): base defaults \< host (`createCli`)
 * root defaults \< config `rootOptionDefaults` (packaged \< project/public \<
 * project/local) \< the parent options bag \< CLI flags.
 *
 * The root hooks build each run's options bag from it, and top-level help
 * builds its side-effect-free context and its labels from it (with no CLI
 * flags), so both see the same defaults.
 */
import type { ResolvedConfigSources } from '@/src/config';
import { baseRootOptionDefaults } from '@/src/defaults';
import { defaultsDeep } from '@/src/util';

import { resolveCliOptions } from './resolveCliOptions';
import type { RootOptionsShape, ScriptsTable } from './types';

/** A merged root options bag, with the config `scripts` merged in. */
export type RootOptionsBag = RootOptionsShape & { scripts?: ScriptsTable };

/**
 * The defaults part of the stack: base \< host root defaults \< config
 * `rootOptionDefaults`.
 *
 * @param defaults - The host's root defaults (`createCli`'s
 *   `rootOptionDefaults`).
 * @param sources - The resolved config sources.
 * @returns The merged defaults.
 */
export function computeRootDefaults(
  defaults: Partial<RootOptionsShape> | undefined,
  sources: ResolvedConfigSources,
): Partial<RootOptionsShape> {
  const cfgDefaults = defaultsDeep<Partial<RootOptionsShape>>(
    {},
    sources.packaged?.rootOptionDefaults ?? {},
    sources.project?.public?.rootOptionDefaults ?? {},
    sources.project?.local?.rootOptionDefaults ?? {},
  );
  return defaultsDeep<Partial<RootOptionsShape>>(
    baseRootOptionDefaults as Partial<RootOptionsShape>,
    defaults ?? {},
    cfgDefaults,
  );
}

/**
 * The whole stack: the defaults, then the parent options bag
 * (`process.env.getDotenvCliOptions`), then the raw CLI flags; the config
 * `scripts` (packaged \< project/public \< project/local) are merged into the
 * bag's own `scripts`.
 *
 * @param raw - The root's parsed flags (`opts()`); `{}` for none.
 * @param defaults - The host's root defaults.
 * @param sources - The resolved config sources.
 * @returns The merged bag.
 */
export function resolveRootOptionsBag(
  raw: Record<string, unknown>,
  defaults: Partial<RootOptionsShape> | undefined,
  sources: ResolvedConfigSources,
): RootOptionsBag {
  const { merged } = resolveCliOptions<RootOptionsBag>(
    raw,
    computeRootDefaults(defaults, sources),
    process.env.getDotenvCliOptions,
  );
  (merged as unknown as Record<string, unknown>).scripts = defaultsDeep(
    {},
    merged.scripts ?? {},
    (sources.packaged?.scripts as ScriptsTable | undefined) ?? {},
    (sources.project?.public?.scripts as ScriptsTable | undefined) ?? {},
    (sources.project?.local?.scripts as ScriptsTable | undefined) ?? {},
  );
  return merged;
}
