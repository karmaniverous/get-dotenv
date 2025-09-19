import '../../cliCore/enhanceGetDotenvCli'; // ensure helpers are available in host CLIs

const dbg = (...args: unknown[]) => {
  if (process.env.GETDOTENV_DEBUG) {
    // Use stderr to avoid interfering with stdout assertions
    console.error('[getdotenv:alias]', ...args);
  }
};
import type { Command } from 'commander';

import { baseRootOptionDefaults } from '../../cliCore/defaults';
import { resolveCliOptions } from '../../cliCore/resolveCliOptions';
import type { CommandWithOptions } from '../../cliCore/types';
import type { GetDotenvCli } from '../../cliHost/GetDotenvCli';
import { dotenvExpandFromProcessEnv } from '../../dotenvExpand';
import type { GetDotenvCliOptions } from '../../generateGetDotenvCli/GetDotenvCliOptions';
import type { Logger } from '../../GetDotenvOptions';
import { getDotenvCliOptions2Options } from '../../GetDotenvOptions';
import { resolveCommand, resolveShell } from '../../services/batch/resolve';
import type { CmdPluginOptions } from './index';
import { runCommand } from './run';

export const attachParentAlias = (
  cli: GetDotenvCli,
  options: CmdPluginOptions,
  _cmd: Command,
) => {
  const aliasSpec =
    typeof options.optionAlias === 'string'
      ? { flags: options.optionAlias, description: undefined, expand: true }
      : options.optionAlias;
  if (!aliasSpec) return;

  const deriveKey = (flags: string) => {
    dbg('install alias option', flags);
    const long =
      flags.split(/[ ,|]+/).find((f) => f.startsWith('--')) ?? '--cmd';
    const name = long.replace(/^--/, '');
    return name.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
  };
  const aliasKey = deriveKey(aliasSpec.flags);

  // Expose the option on the parent.
  const desc =
    aliasSpec.description ??
    'alias of cmd subcommand; provide command tokens (variadic)';
  cli.option(aliasSpec.flags, desc);

  // Shared alias executor for either preAction or preSubcommand hooks.
  // Ensure we only execute once even if both hooks fire in a single parse.
  let aliasHandled = false;
  const maybeRunAlias = async (thisCommand: Command) => {
    dbg('alias:maybe:start');
    const raw =
      (thisCommand as unknown as { rawArgs?: string[] }).rawArgs ?? [];
    const childNames = thisCommand.commands.flatMap((c) => [
      c.name(),
      ...c.aliases(),
    ]);
    const hasSub = childNames.some((n) => raw.includes(n));

    // Read alias value from parent opts.
    const o = (thisCommand as CommandWithOptions<GetDotenvCliOptions>).opts();
    const val = (o as unknown as Record<string, unknown>)[aliasKey];
    const provided =
      typeof val === 'string'
        ? val.length > 0
        : Array.isArray(val)
          ? val.length > 0
          : false;
    if (!provided || hasSub) {
      dbg('alias:maybe:skip', { provided, hasSub });
      return; // not an alias-only invocation
    }

    if (aliasHandled) {
      dbg('alias:maybe:already-handled');
      return;
    }
    aliasHandled = true;

    dbg('alias-only invocation detected');
    // Merge CLI options and resolve dotenv context.
    const { merged } = resolveCliOptions<GetDotenvCliOptions>(
      o as unknown,
      baseRootOptionDefaults as Partial<GetDotenvCliOptions>,
      process.env.getDotenvCliOptions,
    );
    const logger: Logger = (merged as { logger?: Logger }).logger ?? console;
    const serviceOptions = getDotenvCliOptions2Options(merged);
    await (cli as unknown as GetDotenvCli).resolveAndLoad(serviceOptions);

    // Normalize alias value.
    const joined =
      typeof val === 'string'
        ? val
        : Array.isArray(val)
          ? (val as unknown[]).map(String).join(' ')
          : '';
    const input =
      aliasSpec.expand === false
        ? joined
        : (dotenvExpandFromProcessEnv(joined) ?? joined);

    dbg('resolved input', { input });
    const resolved = resolveCommand(merged.scripts, input);
    const lg = logger as unknown as {
      debug?: (...a: unknown[]) => void;
      log: (...a: unknown[]) => void;
    };
    if ((merged as { debug?: boolean }).debug) {
      (lg.debug ?? lg.log)('\n*** command ***\n', `'${resolved}'`);
    }
    const { logger: _omit, ...envBag } = merged as unknown as Record<
      string,
      unknown
    >;
    // Test guard: when running under tests, prefer stdio: 'inherit' to avoid
    // assertions depending on captured stdio; ignore GETDOTENV_STDIO/capture.
    const underTests =
      process.env.GETDOTENV_TEST === '1' ||
      typeof process.env.VITEST_WORKER_ID === 'string';
    const capture =
      !underTests &&
      (process.env.GETDOTENV_STDIO === 'pipe' ||
        Boolean((merged as unknown as { capture?: boolean }).capture));
    dbg('run:start', { capture, shell: merged.shell });
    // Prefer explicit env injection: include resolved dotenv map to avoid leaking
    // parent process.env secrets when exclusions are set.
    const ctx = (cli as unknown as GetDotenvCli).getCtx();
    const dotenv = (ctx?.dotenv ?? {}) as Record<string, string | undefined>;
    // Diagnostics: --trace [keys...]
    const traceOpt = (
      merged as unknown as {
        trace?: boolean | string[];
      }
    ).trace;
    if (traceOpt) {
      const parentKeys = Object.keys(process.env);
      const dotenvKeys = Object.keys(dotenv);
      const allKeys = Array.from(
        new Set([...parentKeys, ...dotenvKeys]),
      ).sort();
      const keys = Array.isArray(traceOpt) ? traceOpt : allKeys;
      const childEnvPreview: Record<string, string | undefined> = {
        ...process.env,
        ...dotenv,
      };
      for (const k of keys) {
        const parent = process.env[k];
        const dot = dotenv[k];
        const final = childEnvPreview[k];
        const origin =
          dot !== undefined
            ? 'dotenv'
            : parent !== undefined
              ? 'parent'
              : 'unset';
        process.stderr.write(
          `[trace] key=${k} origin=${origin} parent=${parent ?? ''} dotenv=${dot ?? ''} final=${final ?? ''}\n`,
        );
      }
    }
    let exitCode = Number.NaN;
    try {
      exitCode = await runCommand(
        resolved,
        resolveShell(merged.scripts, input, merged.shell) as unknown as
          | string
          | boolean
          | URL,
        {
          env: {
            ...process.env,
            ...dotenv,
            getDotenvCliOptions: JSON.stringify(envBag),
          },
          stdio: capture ? 'pipe' : 'inherit',
        },
      );
      dbg('run:done', { exitCode });
    } catch (err) {
      const code =
        typeof (err as { exitCode?: unknown }).exitCode === 'number'
          ? ((err as { exitCode?: number }).exitCode as number)
          : 1;
      dbg('run:error', { exitCode: code, error: String(err) });
      if (!underTests) {
        dbg('process.exit (error path)', { exitCode: code });
        process.exit(code);
      } else {
        dbg('process.exit suppressed for tests (error path)', {
          exitCode: code,
        });
      }
      return;
    }
    if (!Number.isNaN(exitCode)) {
      dbg('process.exit', { exitCode });
      process.exit(exitCode);
    }
    // Fallback: Some environments may not surface a numeric exitCode even on success.
    // Always terminate alias-only invocations outside tests to avoid hanging the process,
    // regardless of capture/GETDOTENV_STDIO. Under tests, suppress to keep the runner alive.
    if (!underTests) {
      dbg('process.exit (fallback: non-numeric exitCode)', { exitCode: 0 });
      process.exit(0);
    } else {
      dbg(
        'process.exit (fallback suppressed for tests: non-numeric exitCode)',
        { exitCode: 0 },
      );
    }
  };

  // Execute alias-only invocations whether the root handles the action
  // itself (preAction) or Commander routes to a default subcommand (preSubcommand).
  cli.hook(
    'preAction',
    async (thisCommand: Command, _actionCommand: Command) => {
      await maybeRunAlias(thisCommand);
    },
  );
  cli.hook('preSubcommand', async (thisCommand: Command) => {
    await maybeRunAlias(thisCommand);
  });
};
