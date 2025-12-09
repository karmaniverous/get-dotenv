import { describe, expect, it } from 'vitest';

import { definePlugin } from './definePlugin';
import { GetDotenvCli } from './GetDotEnvCli';

describe('cliHost nested composition (mount propagation)', () => {
  it('parent returns ns("parent"); child mounts under it', () => {
    const parent = definePlugin({
      ns: 'parent',
      id: 'parent',
      setup(cli) {
        cli.description('parent ns');
        return undefined;
      },
    });
    const child = definePlugin({
      ns: 'child',
      id: 'child',
      setup(cli) {
        cli.description('child ns');
        return undefined;
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
