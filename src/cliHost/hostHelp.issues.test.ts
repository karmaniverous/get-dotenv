/**
 * Regression tests for the help defects fixed in S13, from each issue's
 * repro: #76 (root help omits `-h`, `-V` and untagged root options) and the
 * help half of #60 (`rootOptionVisibility` hides nothing; `true` cannot undo
 * a lower `false`).
 */
import { describe, expect, it } from 'vitest';

import { createCli, type CreateCliOptions } from '@/src/cli';
import { composeVcFixture, createGetdotenvHost } from '@/test/baseline/hosts';
import { HELP_CONFIG, helpText } from '@/test/support/helpText';

/** The option terms listed in a help section. */
const section = (help: string, heading: string): string[] => {
  const lines = help.split('\n');
  const start = lines.indexOf(heading);
  if (start < 0) return [];
  const end = lines.indexOf('', start);
  return lines
    .slice(start + 1, end < 0 ? undefined : end)
    .filter((l) => /^ {2}-/.test(l))
    .map((l) => l.trim().split(/ {2,}/)[0] ?? '');
};

/** The vc fixture host with extra `createCli` options. */
const vcWith =
  (options: Partial<CreateCliOptions> = {}) =>
  () =>
    createCli({
      importMetaUrl: import.meta.url,
      alias: 'vc',
      ...options,
      compose: (p) => {
        composeVcFixture(p).option(
          '--untagged-root',
          'an untagged root option',
        );
        return p;
      },
    });

describe('#76 root help lists -h, -V and every untagged root option', () => {
  it('getdotenv -h (the issue repro)', async () => {
    const options = section(
      await helpText(createGetdotenvHost, ['-h']),
      'Options:',
    );
    expect(options).toContain('-h, --help');
    expect(options).toContain('-V, --version');
  });

  it('a host with an untagged root option', async () => {
    const options = section(await helpText(vcWith(), ['-h']), 'Options:');
    expect(options).toContain('-h, --help');
    expect(options).toContain('-V, --version');
    expect(options).toContain('--untagged-root');
  });
});

describe('#60 root option visibility in help', () => {
  it('createCli visibility hides shell, capture and trace (the issue repro)', async () => {
    const help = await helpText(
      vcWith({
        rootOptionVisibility: { shell: false, capture: false, trace: false },
      }),
      ['-h'],
    );
    const options = section(help, 'Options:');
    for (const term of [
      '-s, --shell [string]',
      '-S, --shell-off',
      '--capture',
      '--trace [keys...]',
    ])
      expect(options).not.toContain(term);
    expect(options).toContain('-e, --env <string>');
  });

  it('createCli visibility hides env and debug', async () => {
    const options = section(
      await helpText(
        vcWith({ rootOptionVisibility: { env: false, debug: false } }),
        ['-h'],
      ),
      'Options:',
    );
    for (const term of ['-e, --env <string>', '--debug', '--debug-off'])
      expect(options).not.toContain(term);
  });

  it('a config true shows what a createCli false hid, in root and subcommand help', async () => {
    const host = vcWith({
      rootOptionVisibility: { shell: false, capture: false },
    });
    const files = {
      'getdotenv.config.local.json': JSON.stringify({
        rootOptionVisibility: { shell: true },
      }),
      'getdotenv.config.json': JSON.stringify(HELP_CONFIG),
    };
    const root = section(await helpText(host, ['-h'], files), 'Options:');
    expect(root).toContain('-s, --shell [string]');
    expect(root).not.toContain('--capture');
    const inherited = section(
      await helpText(host, ['aws', '-h'], files),
      'vc options (anywhere):',
    );
    expect(inherited).toContain('--vc-shell [string]');
    expect(inherited).not.toContain('--vc-capture');
  });
});
