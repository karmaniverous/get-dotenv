import { describe, expect, it } from 'vitest';

import { GetDotenvCli } from '@/src/cliHost';

import { batchPlugin } from './index';

describe('plugins/batch dynamic help', () => {
  it('shows effective defaults from plugin config in "help batch"', async () => {
    const cli = new GetDotenvCli('test')
      .overrideRootOptions()
      .use(batchPlugin());
    await cli.install();

    // Evaluate dynamic option descriptions using a synthetic resolved config:
    // - plugins.batch: pkgCwd ON; rootPath "./work"; globs "apps/*"
    cli.evaluateDynamicOptions({
      plugins: {
        batch: {
          pkgCwd: true,
          rootPath: './work',
          globs: 'apps/*',
        },
      },
    });

    // Render batch subcommand help; plugin options should appear here.
    const commands = ((
      cli as unknown as {
        commands?: Array<{ name: () => string; helpInformation: () => string }>;
      }
    ).commands ?? []) as Array<{
      name: () => string;
      helpInformation: () => string;
    }>;
    const batch = commands.find(
      (c) => typeof c.name === 'function' && c.name() === 'batch',
    );
    const help =
      typeof batch?.helpInformation === 'function'
        ? batch.helpInformation()
        : '';

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
