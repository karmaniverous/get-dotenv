import type { CommandUnknownOpts } from '@commander-js/extra-typings';

import type { GetDotenvCliPublic } from '@/src/cliHost/definePlugin';
import type { PluginWithInstanceHelpers } from '@/src/cliHost/definePlugin';
import {
  baseGetDotenvCliOptions,
  type GetDotenvCliOptions,
} from '@/src/cliHost/GetDotenvCliOptions';
import { resolveCliOptions } from '@/src/cliHost/resolveCliOptions';
import type { RootOptionsShape, ScriptsTable } from '@/src/cliHost/types';
import { dotenvExpandFromProcessEnv } from '@/src/dotenvExpand';
import type { RootOptionsShapeCompat } from '@/src/GetDotenvOptions';
import { getDotenvCliOptions2Options } from '@/src/GetDotenvOptions';

import { runCmdWithContext } from './runner';
import type { CmdPluginOptions } from './types';

/**
 * Install the parent-level invoker (alias) for the cmd plugin.
 * Unifies naming with batch attachParentInvoker; behavior unchanged.
 */
export const attachParentInvoker = (
  cli: GetDotenvCliPublic,
  options: CmdPluginOptions,
  _cmd: CommandUnknownOpts,
  plugin: PluginWithInstanceHelpers,
) => {
  const dbg = (...args: unknown[]) => {
    if (process.env.GETDOTENV_DEBUG) {
      try {
        const line = args
          .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
          .join(' ');
        process.stderr.write(`[getdotenv:alias] ${line}\n`);
      } catch {
        /* ignore */
      }
    }
  };
  const aliasSpec =
    typeof options.optionAlias === 'string'
      ? { flags: options.optionAlias, description: undefined, expand: true }
      : options.optionAlias;
  if (!aliasSpec) return;

  const deriveKey = (flags: string) => {
    // install alias option
    if (process.env.GETDOTENV_DEBUG) {
      console.error('[getdotenv:alias] install alias option', flags);
    }
    const long =
      flags.split(/[ ,|]+/).find((f) => f.startsWith('--')) ?? '--cmd';
    const name = long.replace(/^--/, '');
    return name.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
  };
  const aliasKey = deriveKey(aliasSpec.flags);

  // Expose the option on the parent (root) command.
  const parentCmd =
    (cli.parent as unknown as GetDotenvCliPublic | null) ??
    (cli as unknown as GetDotenvCliPublic);
  const desc =
    aliasSpec.description ??
    'alias of cmd subcommand; provide command tokens (variadic)';
  parentCmd.option(aliasSpec.flags, desc);
  // Tag the just-added parent option for grouped help rendering at the root.
  const optsArr = parentCmd.options;
  if (optsArr.length > 0) {
    const last = optsArr[optsArr.length - 1];
    if (last) parentCmd.setOptionGroup(last, 'plugin:cmd');
  }

  // Shared alias executor for either preAction or preSubcommand hooks.
  // Ensure we only execute once even if both hooks fire in a single parse.
  const aliasState = { handled: false };
  const maybeRun = async (thisCommand: unknown) => {
    dbg('maybeRun:start');
    // Read plugin config expand default; fall back to undefined (handled in maybeRunAlias)
    let expandDefault: boolean | undefined = undefined;
    try {
      const cfg = plugin.readConfig<{ expand?: boolean }>(cli);
      if (typeof cfg.expand === 'boolean') expandDefault = cfg.expand;
    } catch {
      /* config may be unavailable before resolve; default handled downstream */
    }
    // Inspect parent options and rawArgs to detect alias-only invocation.
    if (aliasState.handled) return;
    const cmd = thisCommand as CommandUnknownOpts & {
      opts?: () => Record<string, unknown>;
      rawArgs?: string[];
      commands: Array<{ name: () => string; aliases: () => string[] }>;
    };
    dbg('maybeRun:rawArgs', cmd.rawArgs ?? []);
    const raw = typeof cmd.opts === 'function' ? cmd.opts() : {};
    const val = (raw as Record<string, unknown>)[aliasKey];
    const provided =
      typeof val === 'string'
        ? val.length > 0
        : Array.isArray(val)
          ? val.length > 0
          : false;
    dbg('maybeRun:aliasKey', aliasKey, 'provided', provided, 'value', val);
    if (!provided) return;
    const childNames = cmd.commands.flatMap((c) => [c.name(), ...c.aliases()]);
    dbg('maybeRun:childNames', childNames);
    const hasSub = (cmd.rawArgs ?? []).some((t) => childNames.includes(t));
    dbg('maybeRun:hasSub', hasSub);
    if (hasSub) return; // do not run alias when an explicit subcommand is present

    aliasState.handled = true;

    // Merge CLI options and resolve dotenv context for this invocation.
    const { merged } = resolveCliOptions<
      RootOptionsShape & { scripts?: ScriptsTable }
    >(
      raw,
      baseGetDotenvCliOptions as Partial<RootOptionsShape>,
      process.env.getDotenvCliOptions,
    );
    const serviceOptions = getDotenvCliOptions2Options(
      merged as unknown as RootOptionsShapeCompat,
    );
    await cli.resolveAndLoad(serviceOptions);

    // Build input string and apply optional expansion (by config default).
    const joined =
      typeof val === 'string'
        ? val
        : Array.isArray(val)
          ? (val as unknown[]).map(String).join(' ')
          : '';
    const effectiveExpand = expandDefault !== false;
    const expanded = dotenvExpandFromProcessEnv(joined);
    const input = effectiveExpand && expanded !== undefined ? expanded : joined;

    // Hand off to shared runner and terminate (except under tests).
    const exitCode = await runCmdWithContext(
      cli,
      merged as unknown as GetDotenvCliOptions,
      input,
      { origin: 'alias' },
    );
    const underTests =
      process.env.GETDOTENV_TEST === '1' ||
      typeof process.env.VITEST_WORKER_ID === 'string';
    if (!underTests) {
      process.exit(typeof exitCode === 'number' ? exitCode : 0);
    }
  };

  parentCmd.hook('preAction', async (thisCommand) => {
    await maybeRun(thisCommand);
  });
  parentCmd.hook('preSubcommand', async (thisCommand) => {
    await maybeRun(thisCommand);
  });
};
