/**
 * Review 5916926264 #5: the `[getdotenv:argv]` debug line (spec 3.10.5)
 * masks secrets when redaction is on: each `-v`/`--vars` value whole, and
 * the value of any `KEY=VALUE` token whose key matches the redaction
 * patterns. Redaction is resolved as the run resolves it (CLI flags, then
 * config and the host's defaults). With redaction off the debug line, an
 * opt-in diagnostic, prints the argv as given.
 */
import { describe, expect, it } from 'vitest';

import { runFixtureCli } from '@/test/support/fixtureCli';

/** The `[getdotenv:argv]` line of a run. */
const argvLine = async (
  args: string[],
  files: Record<string, string> = {},
): Promise<string> => {
  const { output, error } = await runFixtureCli(args, files);
  expect(error).toBeUndefined();
  const line = output.find((l) => l.startsWith('[getdotenv:argv]'));
  expect(line).toBeDefined();
  return line ?? '';
};

const SECRET_ARGS = [
  '--debug',
  '-v',
  'PLAIN=1 API_SECRET=s3cr3t',
  '-e',
  'DB_PASSWORD=hunter2',
  'probe',
];

describe('[getdotenv:argv] redaction (review 5916926264 #5)', () => {
  it('--redact masks the -v value and a KEY=VALUE token whose key matches', async () => {
    const line = await argvLine(['--redact', ...SECRET_ARGS]);
    expect(line).not.toMatch(/s3cr3t|hunter2/);
    expect(line).toBe(
      '[getdotenv:argv] typed: ["--redact","--debug","-v","[redacted]","-e","DB_PASSWORD=[redacted]","probe"] normalized: ["--redact","--debug","-v","[redacted]","-e","DB_PASSWORD=[redacted]","probe"]',
    );
  });

  it('redaction off prints the argv as given', async () => {
    const line = await argvLine(SECRET_ARGS);
    expect(line).toContain('"PLAIN=1 API_SECRET=s3cr3t"');
    expect(line).toContain('"DB_PASSWORD=hunter2"');
  });

  it('redaction turned on in config applies before the root hooks run', async () => {
    const line = await argvLine(SECRET_ARGS, {
      'getdotenv.config.json': JSON.stringify({
        rootOptionDefaults: { redact: true },
      }),
    });
    expect(line).not.toMatch(/s3cr3t|hunter2/);
  });

  it('--redact-off on the CLI beats redaction on in config', async () => {
    const line = await argvLine(['--redact-off', ...SECRET_ARGS], {
      'getdotenv.config.json': JSON.stringify({
        rootOptionDefaults: { redact: true },
      }),
    });
    expect(line).toContain('"DB_PASSWORD=hunter2"');
  });

  it('--redact-pattern values add to the patterns', async () => {
    const line = await argvLine([
      '--redact',
      '--redact-pattern',
      '^PLAIN_',
      '--debug',
      '-e',
      'PLAIN_X=visible',
      'probe',
    ]);
    expect(line).toContain('"PLAIN_X=[redacted]"');
    expect(line).not.toContain('visible');
  });

  it('a qualified --<alias>-vars value, inline or not, and a short group are masked', async () => {
    const inline = await argvLine([
      '--redact',
      '--debug',
      '--fixture-vars=API_SECRET=s3cr3t',
      'probe',
    ]);
    expect(inline).toContain('"--fixture-vars=[redacted]"');
    expect(inline).toContain('"--vars=[redacted]"');
    expect(inline).not.toContain('s3cr3t');
    const group = await argvLine([
      '--redact',
      '--debug',
      '-vAPI_SECRET=s3cr3t',
      'probe',
    ]);
    expect(group).toContain('"-v[redacted]"');
    expect(group).not.toContain('s3cr3t');
    const after = await argvLine([
      '--redact',
      '--debug',
      '-Pv',
      'API_SECRET=s3cr3t',
      '-PvAPI_SECRET=s3cr3t',
      'probe',
    ]);
    expect(after).toContain('"-Pv","[redacted]","-Pv[redacted]"');
    expect(after).not.toContain('s3cr3t');
    for (const flag of ['--vars', '--fixture-vars']) {
      const long = await argvLine([
        '--redact',
        '--debug',
        flag,
        'PLAIN=1 API_SECRET=s3cr3t',
        'probe',
      ]);
      expect(long).toContain(`"${flag}","[redacted]"`);
      expect(long).not.toContain('s3cr3t');
    }
  });

  it('a qualified --<alias>-redact turns redaction on', async () => {
    const line = await argvLine(['--fixture-redact', ...SECRET_ARGS]);
    expect(line).not.toMatch(/s3cr3t|hunter2/);
  });

  it('every --redact-pattern value counts', async () => {
    const line = await argvLine([
      '--redact',
      '--debug',
      '-e',
      'OTHER_X=hidden',
      '--redact-pattern',
      '^OTHER_',
      '--redact-pattern',
      '^PLAIN_',
      '--',
      'probe',
    ]);
    expect(line).not.toContain('hidden');
  });

  it('masks when the config cannot be read (the run then fails)', async () => {
    const { output } = await runFixtureCli(SECRET_ARGS, {
      'getdotenv.config.json': '{ not json',
    });
    const line = output.find((l) => l.startsWith('[getdotenv:argv]'));
    expect(line).toBeDefined();
    expect(line).not.toMatch(/s3cr3t|hunter2/);
  });
});
