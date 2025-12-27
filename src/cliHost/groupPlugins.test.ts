import { describe, expect, it } from 'vitest';

import { definePlugin } from './definePlugin';
import { GetDotenvCli } from './GetDotenvCli';
import { groupPlugins } from './groupPlugins';

describe('groupPlugins', () => {
  it('creates a namespace-only parent command and mounts children', async () => {
    const child = definePlugin({
      ns: 'init',
      setup(cli) {
        cli.description('init child');
      },
    });

    const program = new GetDotenvCli('smoz');
    program.use(
      groupPlugins({
        ns: 'getdotenv',
        description: 'getdotenv utility functions',
        summary: 'getdotenv tools',
        helpGroup: 'Utilities',
        aliases: ['gd'],
        configure(cli) {
          cli.option('--note', 'extra note');
        },
      }).use(child),
    );

    await program.install();

    const group = program.commands.find((c) => c.name() === 'getdotenv');
    expect(group).toBeTruthy();

    expect(group?.description()).toBe('getdotenv utility functions');
    expect(group?.summary()).toBe('getdotenv tools');
    expect(group?.helpGroup()).toBe('Utilities');
    expect(group?.aliases()).toContain('gd');

    const childCmd = group?.commands.find((c) => c.name() === 'init');
    expect(childCmd).toBeTruthy();
    expect(childCmd?.description()).toBe('init child');

    const hasNote = (group?.options ?? []).some(
      (o) => (o as { long?: string }).long === '--note',
    );
    expect(hasNote).toBe(true);
  });
});
