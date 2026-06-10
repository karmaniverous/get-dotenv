import { beforeEach, describe, expect, it, vi } from 'vitest';

// Prevent actual process spawning.
const runCommandMock =
  vi.fn<
    (
      cmd: string | string[],
      shell: string | boolean | URL,
      opts: { env?: Record<string, string>; stdio?: 'inherit' | 'pipe' },
    ) => Promise<number>
  >();
vi.mock('./exec', () => ({
  shouldCapture: () => true,
  runCommand: (
    cmd: string | string[],
    shell: string | boolean | URL,
    opts: { env?: Record<string, string>; stdio?: 'inherit' | 'pipe' },
  ) => runCommandMock(cmd, shell, opts),
}));

import { createCli } from '@/src/cli';
import { definePlugin } from '@/src/cliHost';

import { groupPlugins } from './groupPlugins';

describe('groupPlugins afterResolve scoping', () => {
  const fired: string[] = [];

  beforeEach(() => {
    fired.length = 0;
    runCommandMock.mockReset().mockResolvedValue(0);
  });

  /**
   * Helper: create a plugin with an afterResolve spy and a simple echo action.
   */
  function spyPlugin(ns: string) {
    return definePlugin({
      ns,
      setup(cli) {
        cli.description(`${ns} plugin`);
        cli
          .command('echo')
          .argument('[words...]')
          .action(() => {
            /* no-op action */
          });
      },
      afterResolve() {
        fired.push(ns);
      },
    });
  }

  it('invoking tools alpha echo → only alpha afterResolve fires', async () => {
    const run = createCli({
      alias: 'test',
      compose: (program) =>
        program.use(
          groupPlugins({ ns: 'tools' })
            .use(spyPlugin('alpha'))
            .use(spyPlugin('beta')),
        ),
    });

    await run(['node', 'test', 'tools', 'alpha', 'echo', 'hello']);

    expect(fired).toContain('alpha');
    expect(fired).not.toContain('beta');
  });

  it('invoking tools beta echo → only beta afterResolve fires', async () => {
    const run = createCli({
      alias: 'test',
      compose: (program) =>
        program.use(
          groupPlugins({ ns: 'tools' })
            .use(spyPlugin('alpha'))
            .use(spyPlugin('beta')),
        ),
    });

    await run(['node', 'test', 'tools', 'beta', 'echo', 'hello']);

    expect(fired).toContain('beta');
    expect(fired).not.toContain('alpha');
  });

  it('group afterResolve fires for any child in the group', async () => {
    const groupPlugin = groupPlugins({
      ns: 'tools',
    });
    // Attach afterResolve to the group plugin itself.
    groupPlugin.afterResolve = () => {
      fired.push('tools-group');
    };
    groupPlugin.use(spyPlugin('alpha')).use(spyPlugin('beta'));

    const run = createCli({
      alias: 'test',
      compose: (program) => program.use(groupPlugin),
    });

    await run(['node', 'test', 'tools', 'alpha', 'echo', 'hi']);

    expect(fired).toContain('tools-group');
    expect(fired).toContain('alpha');
    expect(fired).not.toContain('beta');
  });
});
