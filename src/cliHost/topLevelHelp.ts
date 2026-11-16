/**
 * Top-level help (spec 3.9.3): `-h` that the argv walk leaves with the root.
 *
 * `GetDotenvCli.parseAsync` renders it after normalization, for every host.
 * The help context and the dynamic option labels come from one defaults
 * stack (the host's root defaults \< config `rootOptionDefaults` \< the parent
 * options bag, with no CLI flags), resolved without side effects: no config
 * `dynamic`, no process env, no logging, no output file (#81). Root option
 * visibility merges the host's with the config's. Output is suppressed under
 * a test runner unless `GETDOTENV_STDIO`/`GETDOTENV_STDOUT` is `pipe`.
 */
import {
  type ResolvedConfigSources,
  resolveGetDotenvConfigSources,
} from '@/src/config';
import { getDotenvCliOptions2Options } from '@/src/core';

import type { GetDotenvCli } from './GetDotenvCli';
import { toHelpConfig } from './helpConfig';
import { hostMetaUrlOf } from './hostRoot';
import { resolveRootOptionsBag } from './rootOptionsStack';
import type { RootOptionsShape } from './types';
import {
  applyRootVisibility,
  mergeRootVisibility,
  type VisibilityMap,
} from './visibility';

/** A host's top-level help settings (`createCli` sets them). */
export interface TopLevelHelpSettings {
  /** The host's root defaults (`createCli`'s `rootOptionDefaults`). */
  rootDefaults: Partial<RootOptionsShape>;
  /** The host's root option visibility (`rootOptionVisibility`). */
  visibility: VisibilityMap;
}

const SETTINGS = new WeakMap<GetDotenvCli, TopLevelHelpSettings>();

/**
 * Set a host's top-level help settings.
 *
 * @param program - The host root.
 * @param settings - The settings.
 */
export const configureTopLevelHelp = (
  program: GetDotenvCli,
  settings: TopLevelHelpSettings,
): void => {
  SETTINGS.set(program, settings);
};

/**
 * Whether the process runs under a test runner (Vitest, or
 * `GETDOTENV_TEST=1`).
 *
 * @returns Whether it does.
 */
export const underTestRunner = (): boolean =>
  process.env.GETDOTENV_TEST === '1' ||
  typeof process.env.VITEST_WORKER_ID === 'string';

/**
 * Apply the effective root option visibility for help: the host's
 * (`createCli`) \< packaged \< project/public \< project/local (spec 3.3.4,
 * 4.6). Every key a layer sets decides its flags, so a higher `true` shows
 * what a lower `false` hid (#60). Runs before every help rendering: top-level
 * help, and the root's `preSubcommand` hook ahead of subcommand help.
 *
 * @param program - The host root.
 * @param sources - The host's resolved config sources.
 */
export const applyHelpVisibility = (
  program: GetDotenvCli,
  sources: ResolvedConfigSources,
): void => {
  applyRootVisibility(
    program,
    mergeRootVisibility(
      SETTINGS.get(program)?.visibility,
      sources.packaged?.rootOptionVisibility ?? undefined,
      sources.project?.public?.rootOptionVisibility ?? undefined,
      sources.project?.local?.rootOptionVisibility ?? undefined,
    ),
  );
};

/**
 * Render top-level help.
 *
 * @param program - The host root.
 */
export const renderTopLevelHelp = async (
  program: GetDotenvCli,
): Promise<void> => {
  const rootDefaults = SETTINGS.get(program)?.rootDefaults ?? {};
  const sources = await resolveGetDotenvConfigSources(hostMetaUrlOf(program));
  const helpMerged = resolveRootOptionsBag({}, rootDefaults, sources);
  const { outputPath: _outputPath, ...helpOptions } =
    getDotenvCliOptions2Options(helpMerged);
  const ctx = await program.resolveAndLoad(
    { ...helpOptions, excludeDynamic: true, loadProcess: false, log: false },
    { runAfterResolve: false },
  );
  program.evaluateDynamicOptions(toHelpConfig(helpMerged, ctx.pluginConfigs));

  const piping =
    process.env.GETDOTENV_STDIO === 'pipe' ||
    process.env.GETDOTENV_STDOUT === 'pipe';
  if (underTestRunner() && !piping) return;
  applyHelpVisibility(program, sources);
  program.outputHelp();
};
