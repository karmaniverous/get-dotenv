import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the batch executor to capture inputs
const execMock = vi.fn<(arg: Record<string, unknown>) => void>();
vi.mock('../../services/batch/execShellCommandBatch', () => ({
  execShellCommandBatch: (arg: Record<string, unknown>) => {
    execMock(arg);
  },
}));

import { GetDotenvCli } from '../../cliHost/GetDotenvCli';
import { batchPlugin } from './index';
describe('plugins/batch', () => {
  const logger = {
    info: vi.fn(),
    log: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(() => {
    execMock.mockClear();
    logger.info.mockClear();
    logger.log.mockClear();
    logger.error.mockClear();
  });

  it('invokes list mode with globs and root path', async () => {
    const cli = new GetDotenvCli('test').use(
      batchPlugin({ logger: logger as unknown as Console }),
    );
    await cli.parseAsync([
      'node',
      'test',
      'batch',
      '--list',
      '--globs',
      'a b',
      '--root-path',
      './',
    ]);

    expect(execMock).toHaveBeenCalledTimes(1);
    // Safe after call-count assertion
    const firstCall = execMock.mock.calls[0] as
      | [Record<string, unknown>]
      | undefined;
    const [args] = firstCall as [Record<string, unknown>];
    expect(args.list).toBe(true);
    expect(args.globs).toBe('a b');
    expect(args.rootPath).toBe('./');
  });
  it('resolves shell from script override', async () => {
    const cli = new GetDotenvCli('test').use(
      batchPlugin({
        logger: logger as unknown as Console,
        scripts: { build: { cmd: 'npm run build', shell: '/bin/zsh' } },
        shell: false,
      }),
    );
    await cli.parseAsync([
      'node',
      'test',
      'batch',
      '--command',
      'build',
      '--globs',
      '*',
      '--root-path',
      './',
    ]);

    expect(execMock).toHaveBeenCalledTimes(1);
    const firstCall = execMock.mock.calls[0] as
      | [Record<string, unknown>]
      | undefined;
    const [args] = firstCall as [Record<string, unknown>];
    expect(args.command).toBe('npm run build');
    expect(args.shell).toBe('/bin/zsh');
  });
  it('propagates pkg-cwd flag', async () => {
    const cli = new GetDotenvCli('test').use(
      batchPlugin({ logger: logger as unknown as Console }),
    );
    await cli.parseAsync([
      'node',
      'test',
      'batch',
      '--command',
      'echo ok',
      '--pkg-cwd',
    ]);

    expect(execMock).toHaveBeenCalledTimes(1);
    const firstCall = execMock.mock.calls[0] as
      | [Record<string, unknown>]
      | undefined;
    const [args] = firstCall as [Record<string, unknown>];
    expect(args.pkgCwd).toBe(true);
  });
  it('propagates ignore-errors', async () => {
    const cli = new GetDotenvCli('test').use(
      batchPlugin({ logger: logger as unknown as Console }),
    );
    await cli.parseAsync([
      'node',
      'test',
      'batch',
      '--command',
      'echo ok',
      '--ignore-errors',
    ]);

    expect(execMock).toHaveBeenCalledTimes(1);
    const firstCall = execMock.mock.calls[0] as
      | [Record<string, unknown>]
      | undefined;
    const [args] = firstCall as [Record<string, unknown>];
    expect(args.ignoreErrors).toBe(true);
  });

  it('executes positional command without explicit subcommand', async () => {
    const cli = new GetDotenvCli('test').use(
      batchPlugin({ logger: logger as unknown as Console }),
    );
    await cli.parseAsync(['node', 'test', 'batch', 'echo', 'OK']);

    expect(execMock).toHaveBeenCalledTimes(1);
    const firstCall = execMock.mock.calls[0] as
      | [Record<string, unknown>]
      | undefined;
    const [args] = firstCall as [Record<string, unknown>];
    expect(args.command).toBe('echo OK');
    expect(args.list).toBe(false);
  });
});
