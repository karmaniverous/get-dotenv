/**
 * Issue corpus: the repro of every issue #44–#91 that can run in-process or in
 * a temporary directory, adapted only where the issue's command is external
 * (child commands → the probe; `${USERNAME}` → the controlled
 * `${BASELINE_AMBIENT}`).
 *
 * Not recorded (see the README): #71 (compile-time types only), #80 (needs a
 * real interactive `aws sso login`), #85 (needs a Node process without a TS
 * loader; both harness modes have one), and the AWS-forward half of #75
 * (needs a missing AWS CLI binary; the stub always answers).
 */
import { createCli } from '@/src/cli';
import { GetDotenvCli } from '@/src/cliHost';
import { definePlugin } from '@/src/cliHost/definePlugin';
import { resolveCliOptions } from '@/src/cliHost/resolveCliOptions';
import { getDotenv } from '@/src/core';
import { dotenvExpand } from '@/src/dotenv';
import { editDotenvFile, editDotenvText } from '@/src/dotenv/edit';
import { cmdPlugin } from '@/src/plugins';

import type { BaselineCase, CaseSource, CliCase, LibCase } from '../types';
import { awsChildHelpCase, awsChildProfileFlagCase } from './awsChild';

const P = ['node', 'probe.mjs'];

type CliSpec = Omit<CliCase, 'kind' | 'group' | 'host' | 'source' | 'id'> & {
  host?: CliCase['host'];
};

const gd = (issue: number, suffix: string, spec: CliSpec): CliCase => ({
  kind: 'cli',
  group: typeof spec.host === 'function' ? 'lib' : 'getdotenv',
  host: spec.host ?? 'getdotenv',
  id: `#${String(issue)} ${suffix}`,
  source: `#${String(issue)}` as CaseSource,
  ...spec,
});

const lib = (
  issue: number,
  suffix: string,
  run: LibCase['run'],
  extra: Partial<Omit<LibCase, 'kind' | 'run'>> = {},
): LibCase => ({
  kind: 'lib',
  id: `#${String(issue)} ${suffix}`,
  source: `#${String(issue)}` as CaseSource,
  run,
  ...extra,
});

const tryRun = (fn: () => unknown): unknown => {
  try {
    return { value: fn() };
  } catch (e) {
    return {
      error: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
    };
  }
};

const HIGH_ENTROPY = 'Zx8Qp2Lm9Rt4Vb7Nc1Kd6Hf3Jg5Ws0Ya';

const configJson = (cfg: unknown) => ({
  'getdotenv.config.json': JSON.stringify(cfg, null, 2),
});

const dynConfigJs = (extra = '') => ({
  'getdotenv.config.js': `export default {
  ${extra}
  dynamic: {
    DYN: () => {
      console.error('DYN-EVAL');
      return 'd';
    },
  },
};
`,
});

const commandTree = (cmd: {
  name: () => string;
  commands: readonly unknown[];
}): unknown => ({
  name: cmd.name(),
  commands: cmd.commands.map((c) =>
    commandTree(c as { name: () => string; commands: readonly unknown[] }),
  ),
});

/** Issue repro cases. */
export const issuesCorpus: BaselineCase[] = [
  lib(44, 'ns override', async () => {
    const mk = (ns: string) =>
      definePlugin({
        ns,
        setup(cli) {
          cli.description(ns);
          return undefined;
        },
      });
    const root = new GetDotenvCli('host');
    root
      .use(mk('deploy'), { ns: 'deploy-api' })
      .use(mk('deploy'), { ns: 'deploy-web' });
    let installError: string | null = null;
    try {
      await root.install();
    } catch (e) {
      installError = e instanceof Error ? e.message : String(e);
    }
    const host2 = new GetDotenvCli('host2');
    host2.use(mk('parent').use(mk('whoami'), { ns: 'who2' }));
    await host2.install();
    return { installError, childTree: commandTree(host2) };
  }),

  gd(45, 'off flags', { args: ['-P', '-L', '-A', 'cmd', ...P] }),
  gd(45, 'entropy-warn-off', {
    args: ['--entropy-warn-off', '--trace', 'HIGH', 'cmd', ...P],
    files: { '.env': `APP=base\nHIGH=${HIGH_ENTROPY}\n` },
  }),
  gd(45, 'redact-off', {
    args: ['--redact-off', '--trace', 'SECRET', 'cmd', ...P],
    files: {
      '.env': 'APP=base\nSECRET=plainsecret\n',
      ...configJson({ rootOptionDefaults: { redact: true } }),
    },
  }),

  gd(46, 'redact-pattern', {
    args: [
      '--redact',
      '--redact-pattern',
      'SECRET',
      '--trace',
      'API_SECRET',
      'cmd',
      ...P,
    ],
    files: { '.env': 'APP=base\nAPI_SECRET=supersecretvalue\n' },
  }),
  gd(46, 'log redact', {
    args: ['-l', '--redact'],
    files: { '.env': 'APP=base\nSECRET=plainsecret\n' },
  }),
  gd(46, 'entropy numbers', {
    args: [
      '--entropy-threshold',
      '9',
      '--entropy-min-length',
      '64',
      '--trace',
      'HIGH',
      'cmd',
      ...P,
    ],
    files: { '.env': `APP=base\nHIGH=${HIGH_ENTROPY}\n` },
  }),

  gd(47, 'undefined into process.env', {
    args: ['cmd', ...P, '--print', 'EMPTY'],
    files: { '.env': 'APP=base\nEMPTY=\n' },
  }),

  lib(
    48,
    'getDotenv loads process.env',
    async () => {
      Reflect.deleteProperty(process.env, 'FOO');
      await getDotenv();
      return { FOO: process.env.FOO ?? null };
    },
    { files: { '.env': 'FOO=bar\n' } },
  ),

  gd(49, 'cmd script', {
    args: ['cmd', 'hello'],
    files: configJson({ scripts: { hello: 'node probe.mjs 42' } }),
  }),
  gd(49, 'alias script', {
    args: ['-c', 'hello'],
    files: configJson({ scripts: { hello: 'node probe.mjs 42' } }),
  }),

  gd(50, 'cmd exit', { mode: 'child', args: ['cmd', ...P, '--exit', '4'] }),
  gd(50, 'default exit', { mode: 'child', args: [...P, '--exit', '4'] }),
  gd(50, 'alias exit', {
    mode: 'child',
    args: ['-c', 'node probe.mjs --exit 4'],
  }),
  gd(50, 'batch exit', { mode: 'child', args: ['batch', ...P, '--exit', '3'] }),
  gd(50, 'batch no command', { mode: 'child', args: ['batch'] }),
  gd(50, 'alias conflict', {
    mode: 'child',
    args: ['-c', 'node probe.mjs', 'cmd', ...P],
  }),

  gd(51, 'script shell true', {
    args: ['--debug', 'cmd', 'sh'],
    files: configJson({
      scripts: { sh: { cmd: 'node probe.mjs sh', shell: true } },
    }),
  }),
  gd(51, 'batch argv quoting', {
    args: ['batch', '-g', 'pkgA', ...P, 'a b', 'x$y', 'q"r'],
  }),

  {
    kind: 'cli',
    group: 'vc',
    host: 'vc',
    id: '#52 version',
    source: '#52',
    args: ['-V'],
  },

  gd(53, 'args-only argv', {
    argvForm: 'args',
    args: ['-v', 'APP=hello', 'cmd', ...P, '--print', 'APP'],
  }),

  lib(
    54,
    'editor target',
    async () =>
      editDotenvFile(
        { X: '1' },
        { paths: ['./b', './a'], scope: 'global', privacy: 'private' },
      ),
    {
      files: { 'a/.env.local.template': 'X=0\n', 'b/.env.local': 'Y=1\n' },
      readFiles: ['a/.env.local', 'b/.env.local'],
    },
  ),

  lib(55, 'exports', async () => {
    const m = (await import('@/src/index')) as Record<string, unknown>;
    return {
      resolveDotenvTarget: 'resolveDotenvTarget' in m,
      buildDotenvTargetFilename: 'buildDotenvTargetFilename' in m,
    };
  }),

  gd(56, 'dotenv region overrides session', {
    args: [
      'aws',
      '--strategy',
      'none',
      '--region',
      'eu-west-3',
      'configure',
      'list',
    ],
    files: { '.env': 'APP=base\nAWS_REGION=us-east-1\n' },
  }),
  awsChildProfileFlagCase,

  gd(57, 'whoami really', {
    args: ['aws', 'whoami', 'really'],
    files: { '.env': 'APP=base\nSECRET_IDENTITY=batman\n' },
  }),

  gd(58, 'init gitignore', {
    args: ['init', '.', '--yes'],
    files: { '.gitignore': 'node_modules\r\n\r\n# build\r\ndist\r\n' },
    readFiles: ['.gitignore'],
    listFiles: true,
  }),
  gd(58, 'init dynamic', {
    args: ['init', 'dyn', '--dynamic', '--config-format', 'js', '--yes'],
    listFiles: true,
  }),

  gd(59, 'batch --command capture', {
    args: ['--capture', 'batch', '--command', 'node probe.mjs'],
  }),
  gd(59, 'batch --list capture', { args: ['--capture', 'batch', '--list'] }),
  gd(59, 'batch positional capture', { args: ['--capture', 'batch', ...P] }),

  gd(60, 'visibility shell capture trace', {
    host: () =>
      createCli({
        alias: 'getdotenv',
        rootOptionVisibility: { shell: false, capture: false, trace: false },
      }),
    args: ['-h'],
  }),
  gd(60, 'visibility env debug', {
    host: () =>
      createCli({
        alias: 'getdotenv',
        rootOptionVisibility: { env: false, debug: false },
      }),
    args: ['-h'],
  }),

  gd(61, 'validation twice', {
    args: ['cmd', ...P],
    files: configJson({ requiredKeys: ['MISSING_KEY'] }),
  }),

  gd(62, 'invalid config -h', {
    args: ['-h'],
    files: { 'getdotenv.config.json': '{ "scripts": ' },
  }),
  gd(62, 'invalid config cmd', {
    args: ['cmd', ...P],
    files: { 'getdotenv.config.json': '{ "scripts": ' },
  }),

  gd(63, 'vars against process.env', {
    args: ['-c', 'node probe.mjs --print CFGHOME,FILEV'],
    files: {
      'getdotenv.config.js':
        "export default { vars: { CFGHOME: 'x${BASELINE_AMBIENT}' } };\n",
      '.env': 'APP=base\nFILEV=f${BASELINE_AMBIENT}\n',
    },
  }),

  gd(64, 'compositions', { args: ['cmd', ...P], files: dynConfigJs() }),
  gd(64, 'compositions -z', {
    args: ['-z', 'cmd', ...P],
    files: dynConfigJs(),
  }),
  gd(64, 'compositions alias', {
    args: ['-c', 'node probe.mjs'],
    files: dynConfigJs(),
  }),

  gd(65, 'batch -l runs positionals', {
    args: ['batch', '-g', 'pkgA', '-l', ...P],
  }),

  lib(66, 'no final newline', () => editDotenvText('A=1', { B: '2' })),
  lib(67, 'sync adds nothing', () =>
    editDotenvText('A=1\nC=3\n', { A: '9', B: '2' }, { mode: 'sync' }),
  ),

  gd(68, 'excludeAll default', {
    args: ['cmd', ...P, '--print', 'APP'],
    files: configJson({ rootOptionDefaults: { excludeAll: true } }),
  }),

  gd(69, 'aws forward bag', { args: ['aws', 'sts', 'get-caller-identity'] }),

  gd(70, 'alias value names a subcommand', { args: ['-c', ...P, 'init'] }),
  gd(70, 'optionAlias expand false', {
    host: () =>
      createCli({
        alias: 'getdotenv',
        compose: (p) =>
          p.use(
            cmdPlugin({
              asDefault: true,
              optionAlias: { flags: '-c, --cmd <command...>', expand: false },
            }),
          ),
      }),
    args: ['-S', '-c', 'node probe.mjs $BASELINE_AMBIENT'],
  }),

  lib(72, 'editor writers', () => ({
    hash: editDotenvText('A=1\n', { B: 'x #y' }),
    quote: editDotenvText('C=" old "\n', { C: 'a"b' }),
    backslash: editDotenvText('P="x"\n', { P: 'C:\\new\\dir' }),
  })),
  gd(72, 'output path writer', {
    args: ['-o', 'out.env'],
    files: configJson({
      vars: { H: 'x #y', W: ' lead', M: 'line1\nline2 "q"', B: 'C:\\new\\dir' },
    }),
    readFiles: ['out.env'],
  }),

  gd(73, 'vars split', {
    args: ['-v', 'A=b=c', '-c', 'node probe.mjs --print A'],
  }),

  gd(74, 'capture drops stderr', {
    args: ['--capture', '-c', 'node probe.mjs --stderr 1111'],
  }),

  gd(75, 'alias spawn failure', {
    mode: 'child',
    args: ['-S', '-c', 'baseline-missing-command'],
  }),
  gd(75, 'cmd spawn failure', {
    mode: 'child',
    args: ['-S', 'cmd', 'baseline-missing-command'],
  }),

  gd(76, 'root help', { args: ['-h'] }),

  gd(77, 'createCli defaults beat config', {
    host: () =>
      createCli({
        alias: 'scr',
        compose: (p) => p,
        rootOptionDefaults: { paths: './a' },
      }),
    args: ['-l'],
    files: {
      'a/.env': 'FOO=fromA\n',
      'b/.env': 'FOO=fromB\n',
      ...configJson({ rootOptionDefaults: { paths: './b' } }),
    },
  }),
  gd(77, 'config defaults alone', {
    host: () => createCli({ alias: 'scr', compose: (p) => p }),
    args: ['-l'],
    files: {
      'a/.env': 'FOO=fromA\n',
      'b/.env': 'FOO=fromB\n',
      ...configJson({ rootOptionDefaults: { paths: './b' } }),
    },
  }),

  lib(78, 'expansion', () => ({
    escaped: tryRun(() => dotenvExpand('\\$A $A', { A: 'x' })),
    dollarDollar: tryRun(() => dotenvExpand('$PW', { PW: 'a$$b' })),
    dollarAmp: tryRun(() => dotenvExpand('$P2', { P2: 'x$&y' })),
    self: tryRun(() => dotenvExpand('$SELF', { SELF: '$SELF' })),
  })),

  gd(79, 'spaces collapsed', { args: ['-c', 'node probe.mjs "[x   y]"'] }),
  gd(79, 'backslash space', { args: ['-c', 'node probe.mjs "[a\\ b]"'] }),

  gd(81, 'help runs dynamic', {
    args: ['-h'],
    files: dynConfigJs("rootOptionDefaults: { paths: './b' },"),
  }),

  lib(
    82,
    'empty env',
    async (dir) => getDotenv({ paths: [dir], env: '', defaultEnv: 'dev' }),
    {
      files: {
        '.env..local': 'XLOCAL=read-dot-dot-local\n',
        '.env.dev.local': 'XLOCAL=dev\n',
      },
    },
  ),

  gd(83, 'rootOptionDefaults dynamic', {
    args: ['cmd', ...P, '--print', 'RD'],
    files: configJson({
      rootOptionDefaults: { dynamic: { RD: 'from-rod-dynamic' } },
    }),
  }),
  gd(83, 'rootOptionDefaults dynamic -z', {
    args: ['-z', 'cmd', ...P, '--print', 'RD'],
    files: configJson({
      rootOptionDefaults: { dynamic: { RD: 'from-rod-dynamic' } },
    }),
  }),

  awsChildHelpCase,

  lib(86, 'trailing dollar', () => ({
    cost: dotenvExpand('$A cost $', { A: 'x' }),
    bang: dotenvExpand('$A $!', { A: 'x' }),
    price: dotenvExpand('${A} 100$', { A: 'x' }),
  })),

  gd(87, 'second run', { args: ['cmd', ...P], runs: 2 }),

  gd(88, 'case-only key difference', {
    args: ['cmd', ...P, '--print', 'GDV_CASE,Gdv_Case'],
    env: { GDV_CASE: 'ambient' },
    files: { '.env': 'APP=base\nGdv_Case=dotenv\n' },
  }),

  gd(89, 'vars expanded twice', {
    args: ['-P', '-v', 'P=\\$5 Q=\\\\$6 R=lit', '-l', 'cmd'],
  }),

  // Shell off: since #90 is fixed the command really runs, and a PowerShell
  // command-not-found lookup takes up to a minute on CI Windows runners.
  gd(90, 'toString', { args: ['-S', 'toString'] }),
  gd(90, 'constructor', { args: ['-S', 'constructor'] }),

  lib(91, 'parent shell false', () => ({
    stringDefault: resolveCliOptions(
      {},
      { shell: '/bin/zsh' },
      JSON.stringify({ shell: false }),
    ).merged.shell,
    trueDefault: resolveCliOptions(
      {},
      { shell: true },
      JSON.stringify({ shell: false }),
    ).merged.shell,
  })),
];
