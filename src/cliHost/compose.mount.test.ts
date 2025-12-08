import { describe, expect, it } from 'vitest';

import { definePlugin } from './definePlugin';
import { GetDotenvCli } from './GetDotEnvCli';

describe('cliHost nested composition (mount propagation)', () => {
  it('parent returns ns("parent"); child mounts under it', async () => {
    const parent = definePlugin({
      id: 'parent',
      setup(cli) {
        const ns = cli.ns('parent').description('parent ns');
        return ns;
      },
    });
    const child = definePlugin({
      id: 'child',
      setup(cli) {
        cli.ns('child').description('child ns');
      },
    });
    parent.use(child);

    const cli = new GetDotenvCli('test')
      .attachRootOptions()
      .use(parent)
      .passOptions();

    // Find the parent command and assert child presence under it.
    const commands = (
      (
        cli as unknown as {
          commands?: Array<{
            name: () => string;
            commands: Array<{ name: () => string }>;
          }>;
        }
      ).commands ?? []
    ).slice();
    const p = commands.find(
      (c) => typeof c.name === 'function' && c.name() === 'parent',
    );
    expect(p).toBeDefined();
    const childNames = (p?.commands ?? []).map((c) => c.name());
    expect(childNames).toContain('child');
  });
});
