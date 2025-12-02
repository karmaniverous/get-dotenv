import type { Command } from 'commander';
import { describe, expect, it } from 'vitest';

import { GetDotenvCli } from '../../cliHost';
import { batchPlugin } from './index';

describe('plugins/batch dynamic help', () => {
  it('shows effective defaults from plugin config in "help batch"', () => {
    const cli = new GetDotenvCli('test')
      .attachRootOptions()
      .use(batchPlugin())
      .passOptions();

    // Evaluate dynamic option descriptions using a synthetic resolved config:
    // - plugins.batch: pkgCwd ON; rootPath "./work"; globs "apps/*"
    (cli as unknown as GetDotenvCli).evaluateDynamicOptions({
      plugins: {
        batch: {
          pkgCwd: true,
          rootPath: './work',
          globs: 'apps/*',
        },
      },
    });

    // Grab the 'batch' subcommand and render its help text
    const batch = (
      (cli as unknown as { commands?: Command[] }).commands ?? []
    ).find((c) => c.name() === 'batch');
    expect(batch).toBeDefined();
    const help = (batch as Command).helpInformation();

    // pkg-cwd: ON (default)
    expect(help).toMatch(/-p, --pkg-cwd[\s\S]*\(default\)/i);
    // root-path default label
    expect(help).toMatch(
      /-r, --root-path <string>[\s\S]*\(default:\s+"\.\/work"\)/i,
    );
    // globs default label
    expect(help).toMatch(
      /-g, --globs <string>[\s\S]*\(default:\s+"apps\/\*"\)/i,
    );
  });
});
