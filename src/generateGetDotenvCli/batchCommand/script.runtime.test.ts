import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the batch executor to capture invocations
const execMock = vi.fn<(arg: Record<string, unknown>) => void>();
vi.mock('../../services/batch/execShellCommandBatch', () => ({
  execShellCommandBatch: (arg: Record<string, unknown>) => {
    execMock(arg);
  },
}));

import { generateGetDotenvCli } from '../index';

describe('generated CLI (batch default cmd: scripts & shell overrides)', () => {
  beforeEach(() => {
    execMock.mockClear();
  });

  it('positional form: resolves scripts and honors per-script shell overrides', async () => {
    const program = await generateGetDotenvCli({
      importMetaUrl: import.meta.url,
      alias: 'gen',
      description: 'Generated CLI',
      logger: console,
      scripts: {
        'bash-only': { cmd: 'echo $SHELL && echo OK', shell: '/bin/bash' },
        plain: { cmd: 'node -v', shell: false },
      },
    });

    // bash-only → /bin/bash
    await program.parseAsync(['node', 'gen', 'batch', 'bash-only']);
    expect(execMock).toHaveBeenCalledTimes(1);
    {
      const [args] = execMock.mock.calls[0] as [Record<string, unknown>];
      expect(args.command).toBe('echo $SHELL && echo OK');
      expect(typeof args.shell === 'string' ? args.shell : '').toBe(
        '/bin/bash',
      );
    }
    execMock.mockClear();

    // plain → shell false
    await program.parseAsync(['node', 'gen', 'batch', 'plain']);
    expect(execMock).toHaveBeenCalledTimes(1);
    {
      const [args] = execMock.mock.calls[0] as [Record<string, unknown>];
      expect(args.command).toBe('node -v');
      expect(args.shell).toBe(false);
    }
  });

  it('option form (-c/--command): resolves scripts and honors per-script shell overrides', async () => {
    const program = await generateGetDotenvCli({
      importMetaUrl: import.meta.url,
      alias: 'gen',
      description: 'Generated CLI',
      logger: console,
      scripts: {
        zsh: { cmd: 'echo $ZSH_NAME', shell: '/bin/zsh' },
      },
    });

    await program.parseAsync(['node', 'gen', 'batch', '-c', 'zsh']);
    expect(execMock).toHaveBeenCalledTimes(1);
    {
      const [args] = execMock.mock.calls[0] as [Record<string, unknown>];
      expect(args.command).toBe('echo $ZSH_NAME');
      expect(typeof args.shell === 'string' ? args.shell : '').toBe('/bin/zsh');
    }
  });
});
