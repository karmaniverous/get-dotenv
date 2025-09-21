import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the batch executor to capture invocations
const execMock = vi.fn<(arg: Record<string, unknown>) => void>();
vi.mock('../../services/batch/execShellCommandBatch', () => ({
  execShellCommandBatch: (arg: Record<string, unknown>) => {
    execMock(arg);
  },
}));

import { generateGetDotenvCli } from '../index';

const expectedDefaultShell =
  process.platform === 'win32' ? 'powershell.exe' : '/bin/bash';

describe('generated CLI (batch default cmd runtime)', () => {
  beforeEach(() => {
    execMock.mockClear();
  });

  it('batch default cmd executes positional tokens with normalized default shell', async () => {
    const program = await generateGetDotenvCli({
      importMetaUrl: import.meta.url,
      alias: 'gen',
      description: 'Generated CLI',
      logger: console,
    });

    await program.parseAsync(['node', 'gen', 'batch', 'echo', 'OK']);
    expect(execMock).toHaveBeenCalledTimes(1);
    const [args] = execMock.mock.calls[0] as [Record<string, unknown>];
    expect(args.command).toBe('echo OK');
    expect(args.list).toBe(false);
    expect(args.rootPath).toBe('./');
    const shell = args.shell as string | boolean | URL | undefined;
    expect(typeof shell === 'string' ? shell : '').toBe(expectedDefaultShell);
    // Merged options bag is forwarded (for nested behavior)
    expect(
      typeof args.getDotenvCliOptions === 'object' ||
        args.getDotenvCliOptions === undefined,
    ).toBe(true);
  });

  it('batch conflict when both --command and positional tokens are provided', async () => {
    const program = await generateGetDotenvCli({
      importMetaUrl: import.meta.url,
      alias: 'gen',
      description: 'Generated CLI',
      logger: console,
    });

    // Spy process.exit to avoid terminating the test process
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);

    await expect(
      program.parseAsync([
        'node',
        'gen',
        'batch',
        '--command',
        'echo A',
        'cmd',
        'echo',
        'B',
      ]),
    ).rejects.toThrow(/process\.exit called/);

    expect(execMock).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });
});
