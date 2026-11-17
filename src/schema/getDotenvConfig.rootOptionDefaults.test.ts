/**
 * Regression tests for #83: config `rootOptionDefaults` rejects `dynamic` and
 * `logger` in every format, JSON/YAML included.
 */
import { describe, expect, it } from 'vitest';

import { runFixtureCli } from '@/test/support/fixtureCli';

import { parseResolveConfig } from './getDotenvConfig';

const DYN_JSON = JSON.stringify({
  rootOptionDefaults: { dynamic: { ROD_DYN: 'from-rod' } },
});

describe('#83 rootOptionDefaults rejects dynamic and logger', () => {
  it.each(['dynamic', 'logger'])('parseResolveConfig rejects %s', (key) => {
    expect(() =>
      parseResolveConfig({ rootOptionDefaults: { [key]: {} } }),
    ).toThrow(`rootOptionDefaults.${key}: "${key}" is not allowed`);
  });

  it('the rest of rootOptionDefaults still parses', () => {
    expect(
      parseResolveConfig({ rootOptionDefaults: { log: true, paths: './' } }),
    ).toEqual({ rootOptionDefaults: { log: true, paths: './' } });
  });

  it.each([[true], [['API_URL', 'DB_HOST']]])(
    'trace takes a boolean or a key list: %j',
    (trace) => {
      expect(parseResolveConfig({ rootOptionDefaults: { trace } })).toEqual({
        rootOptionDefaults: { trace },
      });
    },
  );

  it.each([
    ['getdotenv.config.json', DYN_JSON],
    [
      'getdotenv.config.yaml',
      'rootOptionDefaults:\n  dynamic:\n    ROD_DYN: from-rod\n',
    ],
    [
      'getdotenv.config.yml',
      'rootOptionDefaults:\n  logger:\n    info: nope\n',
    ],
  ])(
    'the issue repro: a %s run fails instead of applying it',
    async (name, body) => {
      const run = await runFixtureCli(['probe'], { [name]: body });
      expect(run.bag).toBeUndefined();
      expect([run.error, ...run.output].join('\n')).toMatch(
        /Invalid config .*getdotenv\.config\.(json|ya?ml)/,
      );
      expect([run.error, ...run.output].join('\n')).toMatch(
        /rootOptionDefaults\.(dynamic|logger): "(dynamic|logger)" is not allowed in rootOptionDefaults/,
      );
    },
  );

  it('a JS config is rejected too', async () => {
    const run = await runFixtureCli(['probe'], {
      'getdotenv.config.mjs':
        "export default { rootOptionDefaults: { dynamic: { ROD_DYN: () => 'x' } } };\n",
    });
    expect(run.bag).toBeUndefined();
    expect([run.error, ...run.output].join('\n')).toContain(
      'rootOptionDefaults.dynamic: "dynamic" is not allowed',
    );
  });
});
