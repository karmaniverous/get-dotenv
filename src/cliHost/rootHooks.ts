import type { ResolvedConfigSources } from '@/src/config';
import {
  resolveGetDotenvConfigSources,
  validateEnvAgainstSources,
} from '@/src/config';
import { getDotenvCliOptions2Options, type GetDotenvOptions } from '@/src/core';
import { baseRootOptionDefaults } from '@/src/defaults';
import { defaultsDeep } from '@/src/util';

import type { GetDotenvCli } from './GetDotenvCli';
import type { GetDotenvCliOptions } from './GetDotenvCliOptions';
import { toHelpConfig } from './helpConfig';
import { hostMetaUrlOf } from './hostRoot';
import { resolveCliOptions } from './resolveCliOptions';
import {
  composedThisParse,
  markComposed,
  markRootHooks,
} from './rootHooksState';
import type { RootOptionsShape, ScriptsTable } from './types';

const dbg = (...args: unknown[]) => {
  if (process.env.GETDOTENV_DEBUG) {
    try {
      const line = args
        .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
        .join(' ');
      process.stderr.write(`[getdotenv:rootHooks] ${line}\n`);
    } catch {
      /* ignore */
    }
  }
};

// Typed projection for concise debug logs without unsafe member access.
const debugView = (o: Partial<RootOptionsShape>) => ({
  env: o.env,
  shell: o.shell,
  log: o.log,
  capture: o.capture,
  strict: o.strict,
});

function computeRootDefaults(
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
 * Validate the composed env against the config sources (`schema` or
 * `requiredKeys`) and log each issue at error level; with `--strict`, exit 1
 * after logging them.
 */
function reportEnvIssues<TOptions extends GetDotenvOptions>(
  program: GetDotenvCli<TOptions>,
  sources: ResolvedConfigSources,
  bag: GetDotenvCliOptions,
): void {
  try {
    const issues = validateEnvAgainstSources(program.getCtx().dotenv, sources);
    if (Array.isArray(issues) && issues.length > 0) {
      issues.forEach((m) => {
        bag.logger.error(m);
      });
      if (bag.strict) process.exit(1);
    }
  } catch {
    /* tolerate non-strict flows */
  }
}

/**
 * Install root-level hooks (preSubcommand/preAction) to handle configuration loading,
 * option resolution, and context initialization before actions run.
 *
 * @param program - The CLI host instance.
 * @param defaults - Optional root defaults overlay.
 */
export function installRootHooks<TOptions extends GetDotenvOptions>(
  program: GetDotenvCli<TOptions>,
  defaults?: Partial<RootOptionsShape>,
): GetDotenvCli<TOptions> {
  // The root hooks own this program's composition; the lazy resolver stands down.
  markRootHooks(program);

  // Propagate resolved env into the options bag so plugins always see
  // the effective environment as bag.env â€” no defaulting logic needed downstream.
  const propagateResolvedEnv = (
    merged: RootOptionsShape & { scripts?: ScriptsTable },
  ) => {
    if (program.hasCtx()) {
      const resolvedCtx = program.getCtx();
      if (resolvedCtx.env) {
        merged.env = resolvedCtx.env;
        (
          program as unknown as {
            _setOptionsBag: (b: GetDotenvCliOptions) => void;
          }
        )._setOptionsBag(merged as unknown as GetDotenvCliOptions);
      }
    }
  };

  // Hook: preSubcommand â€” always runs for subcommand flows.
  program.hook('preSubcommand', async (thisCommand, _actionCommand) => {
    const sources = await resolveGetDotenvConfigSources(hostMetaUrlOf(program));
    const rawArgs =
      (thisCommand as unknown as { rawArgs?: string[] }).rawArgs ?? [];
    dbg('preSubcommand:rawArgs', rawArgs);

    const raw =
      (thisCommand as { opts?: () => Record<string, unknown> }).opts?.() ?? {};

    // Build unified defaults stack for this run:
    // baseRootOptionDefaults < createCli root defaults (argument) < config.rootOptionDefaults
    const d = computeRootDefaults(defaults ?? {}, sources);

    const { merged } = resolveCliOptions<
      RootOptionsShape & { scripts?: ScriptsTable }
    >(raw, d, process.env.getDotenvCliOptions);
    dbg('preSubcommand:merged', debugView(merged));

    // Inject merged scripts from config sources (packaged < project/public < project/local).
    (merged as unknown as Record<string, unknown>).scripts = defaultsDeep(
      {},
      (merged as unknown as { scripts?: ScriptsTable }).scripts ?? {},
      (sources.packaged?.scripts as ScriptsTable | undefined) ?? {},
      (sources.project?.public?.scripts as ScriptsTable | undefined) ?? {},
      (sources.project?.local?.scripts as ScriptsTable | undefined) ?? {},
    );

    // Persist merged bag for nested flows and ergonomic access.
    (
      thisCommand as unknown as {
        getDotenvCliOptions?: GetDotenvCliOptions;
      }
    ).getDotenvCliOptions = merged as unknown as GetDotenvCliOptions;
    (
      program as unknown as {
        _setOptionsBag: (b: GetDotenvCliOptions) => void;
      }
    )._setOptionsBag(merged as unknown as GetDotenvCliOptions);

    // Resolve context for this run via programmatic converter.
    // afterResolve is deferred to preAction where the full command path is known.
    const serviceOptions = getDotenvCliOptions2Options(
      merged,
    ) as unknown as Partial<TOptions>;
    await program.resolveAndLoad(serviceOptions, {
      runAfterResolve: false,
    });
    markComposed(program);

    propagateResolvedEnv(merged);

    // Propagate debug flag to env so dbg() helpers and error boundary see it.
    if ((merged as unknown as Record<string, unknown>).debug) {
      process.env.GETDOTENV_DEBUG = '1';
    }

    // Refresh dynamic help text using the resolved config slices.
    try {
      const ctx = program.getCtx();
      const helpCfg = toHelpConfig(merged, ctx.pluginConfigs);
      program.evaluateDynamicOptions(helpCfg);
    } catch {
      /* best-effort */
    }

    // Global validation (once after overlays). Honor --strict.
    reportEnvIssues(
      program,
      await resolveGetDotenvConfigSources(hostMetaUrlOf(program)),
      merged as unknown as GetDotenvCliOptions,
    );
  });

  // Hook: preAction â€” root-only and parent-alias flows + scoped afterResolve.
  program.hook('preAction', async (thisCommand, actionCommand) => {
    const sources = await resolveGetDotenvConfigSources(hostMetaUrlOf(program));
    const rawArgs =
      (thisCommand as unknown as { rawArgs?: string[] }).rawArgs ?? [];
    dbg('preAction:rawArgs', rawArgs);
    const raw =
      (thisCommand as { opts?: () => Record<string, unknown> }).opts?.() ?? {};

    // Build unified defaults stack for this run:
    // baseRootOptionDefaults < createCli root defaults (argument) < config.rootOptionDefaults
    const d = computeRootDefaults(defaults ?? {}, sources);

    const { merged } = resolveCliOptions<
      RootOptionsShape & { scripts?: ScriptsTable }
    >(raw, d, process.env.getDotenvCliOptions);
    dbg('preAction:merged', debugView(merged));

    // Inject merged scripts from config sources (packaged < project/public < project/local).
    (merged as unknown as Record<string, unknown>).scripts = defaultsDeep(
      {},
      (merged as unknown as { scripts?: ScriptsTable }).scripts ?? {},
      (sources.packaged?.scripts as ScriptsTable | undefined) ?? {},
      (sources.project?.public?.scripts as ScriptsTable | undefined) ?? {},
      (sources.project?.local?.scripts as ScriptsTable | undefined) ?? {},
    );

    (
      thisCommand as unknown as {
        getDotenvCliOptions?: GetDotenvCliOptions;
      }
    ).getDotenvCliOptions = merged as unknown as GetDotenvCliOptions;
    (
      program as unknown as {
        _setOptionsBag: (b: GetDotenvCliOptions) => void;
      }
    )._setOptionsBag(merged as unknown as GetDotenvCliOptions);

    // One composition per run: preSubcommand composed already in subcommand
    // flows; a root-only action composes here (a context left from an
    // earlier parse doesn't count).
    const composesHere = !composedThisParse(program);
    if (composesHere) {
      const serviceOptions = getDotenvCliOptions2Options(
        merged,
      ) as unknown as Partial<TOptions>;
      await program.resolveAndLoad(serviceOptions, { runAfterResolve: false });
      markComposed(program);
    }

    // Always propagate resolved env into the merged bag â€” even when
    // preSubcommand already set the context.  preAction unconditionally
    // builds a fresh `merged` and overwrites the options bag, so the env
    // propagated by preSubcommand is lost without this call.
    propagateResolvedEnv(merged);

    // Propagate debug flag to env so dbg() helpers and error boundary see it.
    if ((merged as unknown as Record<string, unknown>).debug) {
      process.env.GETDOTENV_DEBUG = '1';
    }

    try {
      const ctx = program.getCtx();
      const helpCfg = toHelpConfig(merged, ctx.pluginConfigs);
      program.evaluateDynamicOptions(helpCfg);
    } catch {
      /* tolerate */
    }
    // Validate once per run, in the hook that composed (#61).
    if (composesHere)
      reportEnvIssues(
        program,
        sources,
        merged as unknown as GetDotenvCliOptions,
      );

    // Run afterResolve scoped to the invoked command branch.
    // Walk actionCommand.parent chain to build the full plugin path.
    // Always true after resolution above, but satisfies the type checker.
    const ctx = program.hasCtx() ? program.getCtx() : undefined;
    if (ctx) {
      const segments: string[] = [];
      let node: { name: () => string; parent?: unknown } | undefined =
        actionCommand;
      while (node && node !== (thisCommand as unknown)) {
        segments.unshift(node.name());
        node = (node as { parent?: { name: () => string; parent?: unknown } })
          .parent;
      }
      await (
        program as unknown as {
          _runAfterResolve: (c: typeof ctx, p?: string[]) => Promise<void>;
        }
      )._runAfterResolve(ctx, segments.length > 0 ? segments : undefined);
    }
  });
  return program;
}
