import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock execa to capture invocations without spawning a shell.
const execMock =
  vi.fn<(command: string, opts: Record<string, unknown>) => Promise<void>>();
vi.mock('execa', () => ({
  execaCommand: (cmd: string, opts: Record<string, unknown>) =>
    execMock(cmd, opts),
}));

import { createCli } from '@/src/cli';

import { cmdPlugin } from './index';

describe('plugins/cmd option alias', () => {
  beforeEach(() => {
    execMock.mockClear();
    delete process.env.APP_SETTING;
  });

  it('executes alias when provided on parent (variadic join)', async () => {
    const run = createCli({
      alias: 'test',
      compose: (p) =>
        p.use(
          cmdPlugin({ asDefault: true, optionAlias: '--cmd <command...>' }),
        ),
    });
    await run(['node', 'test', '--cmd', 'echo', 'OK']);

    expect(execMock).toHaveBeenCalledTimes(1);
    const [command, opts] = execMock.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(command).toBe('echo OK');
    expect((opts as { stdio?: string }).stdio).toBe('inherit');
  });

  it('expands alias value with dotenv expansion by default', async () => {
    process.env.FOO = 'BAR';
    const run = createCli({
      alias: 'test',
      compose: (p) =>
        p.use(
          cmdPlugin({ asDefault: true, optionAlias: '--cmd <command...>' }),
        ),
    });
    await run(['node', 'test', '--cmd', 'echo', '$FOO']);

    expect(execMock).toHaveBeenCalledTimes(1);
    const [command] = execMock.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    // $FOO should be expanded to BAR before execution
    expect(command).toBe('echo BAR');
  });

  it('resolves env-specific vars via rootOptionDefaults in alias path', async () => {
    // Regression: the cmd alias invoker used bare baseGetDotenvCliOptions
    // (baseRootOptionDefaults) as defaults, missing project rootOptionDefaults
    // like paths and defaultEnv. This caused the alias to clobber the
    // correctly-resolved context from root hooks with incomplete defaults,
    // losing env-specific variables.
    const run = createCli({
      alias: 'test',
      rootOptionDefaults: {
        paths: './test/full',
        dotenvToken: '.testenv',
        defaultEnv: 'test',
        loadProcess: true,
      },
      compose: (p) =>
        p.use(
          cmdPlugin({ asDefault: true, optionAlias: '-c, --cmd <command...>' }),
        ),
    });

    await run(['node', 'test', '-c', 'echo', 'OK']);

    expect(execMock).toHaveBeenCalledTimes(1);
    const [, opts] = execMock.mock.calls[0] as [
      string,
      { env?: Record<string, string> },
    ];
    // The child env should include ENV_SETTING from .testenv.test
    // (env-specific file under the custom paths/defaultEnv).
    // Before the fix, paths defaulted to './' and defaultEnv was absent,
    // so env-specific files were never loaded.
    expect(opts.env?.ENV_SETTING).toBe('deep_test_setting');
    // Global var should also be present.
    expect(opts.env?.APP_SETTING).toBe('deep_app_setting');
  });

  it('conflicts when alias and cmd subcommand are both provided', async () => {
    // Spy process.exit (defaultCmdAction exits on conflict); do not terminate tests.
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      // no-op under tests
    }) as unknown as never);
    const run = createCli({
      alias: 'test',
      compose: (p) =>
        p.use(
          cmdPlugin({ asDefault: true, optionAlias: '--cmd <command...>' }),
        ),
    });

    await run([
      'node',
      'test',
      '--cmd',
      'echo',
      'OK',
      '--',
      'cmd',
      'echo',
      'X',
    ]);

    expect(exitSpy).toHaveBeenCalled();
    exitSpy.mockRestore();
  });
});
