/**
 * #49 / #70: the `-c/--cmd` alias runs exactly the `cmd` action's code path.
 *
 * - #49: the alias uses the merged options bag (createCli
 *   `rootOptionDefaults`, config `scripts`), the cmd mount's `afterResolve`
 *   scoping and the conflict rules, like `cmd` does.
 * - #70: `optionAlias.expand` is honoured, and a subcommand name inside the
 *   alias value is not mistaken for a subcommand.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Capture child invocations without spawning (shell path: execa(command, opts)).
const execMock =
  vi.fn<(command: string, opts: Record<string, unknown>) => Promise<unknown>>();
vi.mock('execa', () => ({
  execa: (command: string, opts: Record<string, unknown>) =>
    execMock(command, opts),
}));

import { createCli, type CreateCliOptions } from '@/src/cli';
import { GetDotenvCli } from '@/src/cliHost';
import { definePlugin } from '@/src/cliHost/definePlugin';

import { attachCmdAlias } from './alias';
import { cmdPlugin } from './index';
import type { CmdPluginOptions } from './types';

const lastCommand = () =>
  (execMock.mock.calls.at(-1) as [string, Record<string, unknown>])[0];

/**
 * Run one invocation on a fresh host (a host runs once per instance; #87 is
 * S9's).
 */
const run = async (
  args: string[],
  cmd: CmdPluginOptions = { optionAlias: '-c, --cmd <command...>' },
  extra: Partial<CreateCliOptions> = {},
) => {
  await createCli({
    importMetaUrl: import.meta.url,
    alias: 'test',
    ...extra,
    compose: (p) => {
      p.use(cmdPlugin({ asDefault: true, ...cmd }));
      return extra.compose ? extra.compose(p) : p;
    },
  })([...args]);
};

describe('the alias runs the cmd action (#49, #70)', () => {
  beforeEach(() => {
    execMock.mockReset();
    execMock.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
    process.exitCode = undefined;
  });

  it('honours createCli rootOptionDefaults (scripts) like cmd (repro)', async () => {
    const extra = { rootOptionDefaults: { scripts: { hello: 'echo script' } } };
    await run(['cmd', 'hello'], undefined, extra);
    const viaCmd = lastCommand();
    await run(['-c', 'hello'], undefined, extra);
    expect(viaCmd).toBe('echo script');
    expect(lastCommand()).toBe(viaCmd);
  });

  it('runs the cmd mount afterResolve scoping, not the whole tree', async () => {
    const seen: string[] = [];
    const extra: Partial<CreateCliOptions> = {
      compose: (p) =>
        p.use(
          definePlugin({
            ns: 'other',
            setup: () => undefined,
            afterResolve: () => {
              seen.push('other');
            },
          }),
        ),
    };
    await run(['cmd', 'echo', 'x'], undefined, extra);
    const viaCmd = [...seen];
    seen.length = 0;
    await run(['-c', 'echo', 'x'], undefined, extra);
    expect(seen).toEqual(viaCmd);
    expect(seen).not.toContain('other');
  });

  it('honours optionAlias.expand false (#70)', async () => {
    process.env.GDV_ALIAS_EXPAND = 'expanded';
    try {
      await run(['-c', 'echo', '$GDV_ALIAS_EXPAND'], {
        optionAlias: { flags: '-c, --cmd <command...>', expand: false },
      });
    } finally {
      delete process.env.GDV_ALIAS_EXPAND;
    }
    expect(lastCommand()).toBe('echo $GDV_ALIAS_EXPAND');
  });

  it('a subcommand name inside the alias value is part of the command (#70 repro)', async () => {
    await run(['-c', 'echo', 'cmd', 'init']);
    expect(execMock).toHaveBeenCalledTimes(1);
    expect(lastCommand()).toBe('echo cmd init');
  });

  it('routes to cmd when cmd is not the default subcommand, for one parse', async () => {
    const cmd = { asDefault: false, optionAlias: '-c, --cmd <command...>' };
    await run(['-c', 'echo', 'routed'], cmd);
    expect(lastCommand()).toBe('echo routed');
    execMock.mockClear();
    await run([], cmd);
    expect(execMock).not.toHaveBeenCalled();
  });

  it('names the alias option in the conflict message', async () => {
    const errors: string[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...a) => {
      errors.push(a.map(String).join(' '));
    });
    try {
      await run(['-x', 'echo', '-e', 'dev', 'cmd', 'echo'], {
        optionAlias: '-x, --exec-cmd <command...>',
      });
    } finally {
      spy.mockRestore();
    }
    const exitCode = process.exitCode;
    process.exitCode = undefined;
    expect(exitCode).toBe(1);
    expect(errors.join('\n')).toContain(
      '--exec-cmd option conflicts with cmd subcommand.',
    );
    expect(execMock).not.toHaveBeenCalled();
  });
});

describe('attachCmdAlias routing (#49)', () => {
  it('routes only the parse that gives the alias', async () => {
    const parent = new GetDotenvCli('p');
    parent.exitOverride();
    const ran: string[] = [];
    parent.action(() => {
      ran.push('parent');
    });
    const mount = parent.ns('cmd');
    mount.argument('[command...]');
    const alias = attachCmdAlias(mount, { flags: '-c, --cmd <command...>' });
    mount.action(() => {
      ran.push(`cmd:${String(alias.valueOn(parent))}`);
    });

    await parent.parseAsync(['-c', 'echo', 'hi'], { from: 'user' });
    await parent.parseAsync([], { from: 'user' });
    expect(ran).toEqual(['cmd:echo hi', 'parent']);
    expect(alias.flag).toBe('--cmd');
  });
});
