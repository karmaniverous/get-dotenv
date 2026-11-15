/**
 * #46 from the CLI host: `--redact-pattern` is read and adds to the built-in
 * patterns, `-l` output is redacted and entropy-checked, the numeric entropy
 * flags take numbers (and reach `--trace`), a user whitelist extends the
 * built-in one, and the numeric flags' help labels show the effective
 * defaults.
 */
import { describe, expect, it, vi } from 'vitest';

import { baseRootOptionDefaults } from '@/src/defaults';
import { cmdPlugin } from '@/src/plugins/cmd';

import { runFixtureCli, withEnv } from '../../test/support/fixtureCli';

// A 32-character value scoring about 4.9 bits/char.
const HIGH = 'Zx8Qp2Lm9Rt4Vb7Nc1Kd6Hf3Jg5Ws0Ya';
// A 12-character value scoring log2(12) = 3.58 bits/char: below the default
// threshold (3.8) and the default minimum length (16).
const SHORT = 'aZ3kQ9pL2xW7';

const entropyKeys = (output: string[]) =>
  output
    .filter((l) => l.startsWith('[entropy]'))
    .map((l) => /key=(\S+)/.exec(l)?.[1]);

const configFile = (rootOptionDefaults: Record<string, unknown>) => ({
  'getdotenv.config.json': JSON.stringify({ rootOptionDefaults }),
});

describe('diagnostics flags on the CLI host (#46)', () => {
  it('--redact-pattern adds to the built-in patterns in --trace output', async () => {
    const run = await runFixtureCli(
      [
        '--redact',
        '--redact-pattern',
        'CODE$',
        '--trace',
        'T1_API_SECRET',
        'T1_MY_CODE',
        'T1_APP',
        '-S',
        'cmd',
        'node',
        '-e',
        '0',
      ],
      { '.env': 'T1_API_SECRET=s1\nT1_MY_CODE=c1\nT1_APP=a1\n' },
      { compose: (p) => p.use(cmdPlugin()) },
    );
    const trace = run.output.filter((l) => l.startsWith('[trace]'));
    expect(trace).toEqual([
      '[trace] key=T1_API_SECRET origin=dotenv parent=[redacted] dotenv=[redacted] final=[redacted]',
      '[trace] key=T1_MY_CODE origin=dotenv parent=[redacted] dotenv=[redacted] final=[redacted]',
      '[trace] key=T1_APP origin=dotenv parent=a1 dotenv=a1 final=a1',
    ]);
  });

  it('-l output is redacted and entropy-checked', async () => {
    const run = await runFixtureCli(['-l', '--redact', 'probe'], {
      '.env': `L1_SECRET=plainsecret\nL1_HIGH=${HIGH}\nL1_APP=base\n`,
    });
    expect(run.output.join(' ').replace(/\s+/g, ' ')).toContain(
      `{ L1_SECRET: '[redacted]', L1_HIGH: '${HIGH}', L1_APP: 'base' }`,
    );
    expect(entropyKeys(run.output)).toEqual(['L1_HIGH']);
  });

  it('the numeric entropy flags take numbers and take effect on -l', async () => {
    const raised = await runFixtureCli(
      ['--entropy-threshold', '9', '--entropy-min-length', '64', '-l', 'probe'],
      { '.env': `N1_HIGH=${HIGH}\n` },
    );
    expect(raised.bag?.entropyThreshold).toBe(9);
    expect(raised.bag?.entropyMinLength).toBe(64);
    expect(entropyKeys(raised.output)).toEqual([]);

    // Each lowered value alone is not enough; both together warn.
    const thresholdOnly = await runFixtureCli(
      ['--entropy-threshold', '3', '-l', 'probe'],
      { '.env': `N2_SHORT=${SHORT}\n` },
    );
    expect(entropyKeys(thresholdOnly.output)).toEqual([]);
    const minLengthOnly = await runFixtureCli(
      ['--entropy-min-length', '8', '-l', 'probe'],
      { '.env': `N3_SHORT=${SHORT}\n` },
    );
    expect(entropyKeys(minLengthOnly.output)).toEqual([]);
    const both = await runFixtureCli(
      ['--entropy-min-length', '8', '--entropy-threshold', '3', '-l', 'probe'],
      { '.env': `N4_SHORT=${SHORT}\n` },
    );
    expect(entropyKeys(both.output)).toEqual(['N4_SHORT']);
  });

  it('the numeric entropy flags reach --trace', async () => {
    const run = await runFixtureCli(
      [
        '--entropy-min-length',
        '8',
        '--entropy-threshold',
        '3',
        '--trace',
        'N5_SHORT',
        '-S',
        'cmd',
        'node',
        '-e',
        '0',
      ],
      { '.env': `N5_SHORT=${SHORT}\n` },
      { compose: (p) => p.use(cmdPlugin()) },
    );
    expect(entropyKeys(run.output)).toEqual(['N5_SHORT']);
  });

  it('a non-numeric entropy flag value is a usage error', async () => {
    const run = await runFixtureCli(['--entropy-threshold', 'abc', 'probe']);
    expect(run.error ?? run.output.join('\n')).toMatch(
      /entropy threshold must be a number/,
    );
    expect(run.bag).toBeUndefined();
  });

  it('a config whitelist extends the built-in one', async () => {
    const run = await runFixtureCli(['-l', 'probe'], {
      ...configFile({ entropyWhitelist: ['^W1_MINE_'] }),
      '.env': `GIT_W1=${HIGH}\nW1_MINE_X=${HIGH}\nW1_OTHER=${HIGH}\n`,
    });
    expect(run.bag?.entropyWhitelist).toEqual([
      ...baseRootOptionDefaults.entropyWhitelist,
      '^W1_MINE_',
    ]);
    expect(entropyKeys(run.output)).toEqual(['W1_OTHER']);
  });

  it('a --entropy-whitelist flag extends the built-in one', async () => {
    const run = await runFixtureCli(
      ['--entropy-whitelist', '^W2_MINE_', '-l', 'probe'],
      { '.env': `GIT_W2=${HIGH}\nW2_MINE_X=${HIGH}\nW2_OTHER=${HIGH}\n` },
    );
    expect(entropyKeys(run.output)).toEqual(['W2_OTHER']);
  });

  it('the numeric flags help labels show the effective defaults', async () => {
    const chunks: string[] = [];
    const spy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation((chunk: string | Uint8Array) => {
        chunks.push(String(chunk));
        return true;
      });
    try {
      // Top-level help prints under Vitest only with piped stdio.
      await withEnv({ GETDOTENV_STDIO: 'pipe' }, () =>
        runFixtureCli(
          ['-h'],
          configFile({ entropyThreshold: 4.5, entropyMinLength: 24 }),
        ),
      );
    } finally {
      spy.mockRestore();
    }
    const help = chunks.join('').replace(/\s+/g, ' ');
    expect(help).toContain('entropy bits/char threshold (default 4.5)');
    expect(help).toContain('min length to examine for entropy (default 24)');
  });
});
