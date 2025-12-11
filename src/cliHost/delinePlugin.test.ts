import { describe, expect, it } from 'vitest';

import { definePlugin } from './definePlugin';
import { GetDotenvCli } from './GetDotenvCliq';

describe('cliHost/definePlugin helpers', () => {
  it('sibling uniqueness: throws on duplicate child ns under same parent', () => {
    const child = definePlugin({
      ns: 'child',
      setup: () => undefined,
    });
    const parent = definePlugin({
      ns: 'parent',
      setup: () => undefined,
    });
    parent.use(child);
    expect(() => parent.use(child)).toThrow(
      /Duplicate namespace 'child' under 'parent'/i,
    );
  });

  it('createPluginDynamicOption: injects plugin config into help (smoke)', () => {
    // Build a plugin that adds a dynamic option on its mount
    const plugin = (() => {
      const p = definePlugin({
        ns: 'dyn',
        setup(cli) {
          const opt = p.createPluginDynamicOption(
            cli,
            '--demo',
            (_bag, cfg: Readonly<{ demo?: string }>) =>
              `demo=${cfg.demo ?? 'none'}`,
          );
          cli.addOption(opt);
          return undefined;
        },
      });
      return p;
    })();

    const cli = new GetDotenvCli('test')
      .attachRootOptions()
      .use(plugin)
      .passOptions();

    // Provide a synthetic help-time config bag with plugin slice at realized path "dyn"
    (cli as unknown as GetDotenvCli).evaluateDynamicOptions({
      plugins: { dyn: { demo: 'injected' } },
    });

    // Locate the mounted subcommand and render its help
    const commands = ((
      cli as unknown as {
        commands?: Array<{ name: () => string; helpInformation: () => string }>;
      }
    ).commands ?? []) as Array<{
      name: () => string;
      helpInformation: () => string;
    }>;
    const sub = commands.find((c) => c.name() === 'dyn');
    const help =
      typeof sub?.helpInformation === 'function' ? sub.helpInformation() : '';
    expect(help).toMatch(/demo=injected/i);
  });
});
