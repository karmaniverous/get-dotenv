import { stdin as input, stdout as output } from 'node:process';

// NOTE: pay attention to non-interactive detection and precedence
// (--force > --yes > auto-detect). See README for details.
import type { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { createInterface } from 'readline/promises';

import { definePlugin } from '../../cliHost/definePlugin';
import type { GetDotenvCli } from '../../cliHost/GetDotenvCli';
import type { Logger } from '../../GetDotenvOptions';
export type InitPluginOptions = {
  logger?: Logger;
};

type CopyDecision = 'overwrite' | 'example' | 'skip';

const TEMPLATES_ROOT = path.resolve('templates');

/**
 * Determine whether the current environment should be treated as
 * non-interactive. We consider it non-interactive when either:
 * - stdin or stdout is not a TTY, or
 * - a CI-like environment variable is present.
 *
 * CI heuristics include: CI, GITHUB_ACTIONS, BUILDKITE, TEAMCITY_VERSION, TF_BUILD.
 */
const isNonInteractive = () => {
  const ciLike =
    process.env.CI ||
    process.env.GITHUB_ACTIONS ||
    process.env.BUILDKITE ||
    process.env.TEAMCITY_VERSION ||
    process.env.TF_BUILD;
  return Boolean(ciLike) || !(input.isTTY && output.isTTY);
};

const ensureDir = async (p: string) => {
  await fs.ensureDir(p);
  return p;
};

const writeFile = async (dest: string, data: string) => {
  await ensureDir(path.dirname(dest));
  await fs.writeFile(dest, data, 'utf-8');
};

const copyTextFile = async (
  src: string,
  dest: string,
  substitutions?: Record<string, string>,
) => {
  const contents = await fs.readFile(src, 'utf-8');
  const out =
    substitutions && Object.keys(substitutions).length > 0
      ? Object.entries(substitutions).reduce(
          (acc, [k, v]) => acc.split(k).join(v),
          contents,
        )
      : contents;
  await writeFile(dest, out);
};

const promptDecision = async (
  filePath: string,
  logger: Logger,
  rl: ReturnType<typeof createInterface>,
): Promise<'o' | 'e' | 's' | 'O' | 'E' | 'S'> => {
  logger.log(
    `File exists: ${filePath}\nChoose: [o]verwrite, [e]xample, [s]kip, [O]verwrite All, [E]xample All, [S]kip All`,
  );

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    const a = (await rl.question('> ')).trim();
    const valid = ['o', 'e', 's', 'O', 'E', 'S'] as const;
    if ((valid as readonly string[]).includes(a))
      return a as 'o' | 'e' | 's' | 'O' | 'E' | 'S';
    logger.log('Please enter one of: o e s O E S');
  }
};

const planConfigCopies = ({
  format,
  withLocal,
  destRoot,
}: {
  format: 'json' | 'yaml' | 'js' | 'ts';
  withLocal: boolean;
  destRoot: string;
}): Array<{ src: string; dest: string; subs?: Record<string, string> }> => {
  // CopySpec with optional substitutions; config files have no tokens.
  const copies: Array<{
    src: string;
    dest: string;
    subs?: Record<string, string>;
  }> = [];
  if (format === 'json') {
    copies.push({
      src: path.join(
        TEMPLATES_ROOT,
        'config',
        'json',
        'public',
        'getdotenv.config.json',
      ),
      dest: path.join(destRoot, 'getdotenv.config.json'),
    });
    if (withLocal) {
      copies.push({
        src: path.join(
          TEMPLATES_ROOT,
          'config',
          'json',
          'local',
          'getdotenv.config.local.json',
        ),
        dest: path.join(destRoot, 'getdotenv.config.local.json'),
      });
    }
  } else if (format === 'yaml') {
    copies.push({
      src: path.join(
        TEMPLATES_ROOT,
        'config',
        'yaml',
        'public',
        'getdotenv.config.yaml',
      ),
      dest: path.join(destRoot, 'getdotenv.config.yaml'),
    });
    if (withLocal) {
      copies.push({
        src: path.join(
          TEMPLATES_ROOT,
          'config',
          'yaml',
          'local',
          'getdotenv.config.local.yaml',
        ),
        dest: path.join(destRoot, 'getdotenv.config.local.yaml'),
      });
    }
  } else if (format === 'js') {
    copies.push({
      src: path.join(TEMPLATES_ROOT, 'config', 'js', 'getdotenv.config.js'),
      dest: path.join(destRoot, 'getdotenv.config.js'),
    });
  } else {
    copies.push({
      src: path.join(TEMPLATES_ROOT, 'config', 'ts', 'getdotenv.config.ts'),
      dest: path.join(destRoot, 'getdotenv.config.ts'),
    });
  }
  return copies;
};

const planCliCopies = ({
  cliName,
  destRoot,
}: {
  cliName: string;
  destRoot: string;
}): Array<{ src: string; dest: string; subs?: Record<string, string> }> => {
  const subs = { __CLI_NAME__: cliName };
  const base = path.join(destRoot, 'src', 'cli', cliName);
  return [
    {
      src: path.join(TEMPLATES_ROOT, 'cli', 'ts', 'index.ts'),
      dest: path.join(base, 'index.ts'),
      subs,
    },
    {
      src: path.join(TEMPLATES_ROOT, 'cli', 'ts', 'plugins', 'hello.ts'),
      dest: path.join(base, 'plugins', 'hello.ts'),
      subs,
    },
  ];
};

export const initPlugin = (opts: InitPluginOptions = {}) =>
  definePlugin({
    id: 'init',
    setup(cli: GetDotenvCli) {
      const logger = opts.logger ?? console;
      const cmd = cli
        .ns('init')
        .description(
          'Scaffold getdotenv config files and a host-based CLI skeleton.',
        )
        .argument('[dest]', 'destination path (default: ./)', '.')
        .option(
          '--config-format <format>',
          'config format: json|yaml|js|ts',
          'json',
        )
        .option('--with-local', 'include .local config variant')
        .option('--dynamic', 'include dynamic examples (JS/TS configs)')
        .option('--cli-name <string>', 'CLI name for skeleton and tokens')
        .option('--force', 'overwrite all existing files')
        .option('--yes', 'skip all collisions (no overwrite)')
        .action(async (destArg?: string) => {
          // Read options directly from the captured command instance.
          // Cast to a plain record to satisfy exact-optional and lint safety.
          const o =
            ((cmd as unknown as Command).opts() as
              | Record<string, unknown>
              | undefined) ?? {};
          const destRel =
            typeof destArg === 'string' && destArg.length > 0 ? destArg : '.';
          const cwd = process.cwd();
          const destRoot = path.resolve(cwd, destRel);

          const formatInput = o.configFormat;
          const formatRaw =
            typeof formatInput === 'string'
              ? formatInput.toLowerCase()
              : 'json';
          const format = (
            ['json', 'yaml', 'js', 'ts'].includes(formatRaw)
              ? formatRaw
              : 'json'
          ) as 'json' | 'yaml' | 'js' | 'ts';
          const withLocal = !!o.withLocal;
          // dynamic flag reserved for future template variants; present for UX compatibility
          void o.dynamic;

          // CLI name default: --cli-name | basename(dest) | 'mycli'
          const cliName =
            (typeof o.cliName === 'string' && o.cliName.length > 0
              ? o.cliName
              : path.basename(destRoot) || 'mycli') || 'mycli';

          // Precedence: --force > --yes > auto-detect(non-interactive => yes)
          const force = !!o.force;
          const yes = !!o.yes || (!force && isNonInteractive());

          // Build copy plan
          const cfgCopies = planConfigCopies({ format, withLocal, destRoot });
          const cliCopies = planCliCopies({ cliName, destRoot });
          const copies: Array<{
            src: string;
            dest: string;
            subs?: Record<string, string>;
          }> = [...cfgCopies, ...cliCopies];

          // Interactive state
          let globalDecision: CopyDecision | undefined;
          const rl = createInterface({ input, output });

          try {
            for (const item of copies) {
              const exists = await fs.pathExists(item.dest);
              if (!exists) {
                const subs = item.subs ?? {};
                await copyTextFile(item.src, item.dest, subs);
                logger.log(`Created ${path.relative(cwd, item.dest)}`);
                continue;
              }

              // Collision
              if (force) {
                const subs = item.subs ?? {};
                await copyTextFile(item.src, item.dest, subs);
                logger.log(`Overwrote ${path.relative(cwd, item.dest)}`);
                continue;
              }
              if (yes) {
                logger.log(`Skipped ${path.relative(cwd, item.dest)}`);
                continue;
              }

              let decision = globalDecision;
              if (!decision) {
                const a = await promptDecision(item.dest, logger, rl);
                if (a === 'O') {
                  globalDecision = 'overwrite';
                  decision = 'overwrite';
                } else if (a === 'E') {
                  globalDecision = 'example';
                  decision = 'example';
                } else if (a === 'S') {
                  globalDecision = 'skip';
                  decision = 'skip';
                } else {
                  decision =
                    a === 'o' ? 'overwrite' : a === 'e' ? 'example' : 'skip';
                }
              }

              if (decision === 'overwrite') {
                const subs = item.subs ?? {};
                await copyTextFile(item.src, item.dest, subs);
                logger.log(`Overwrote ${path.relative(cwd, item.dest)}`);
              } else if (decision === 'example') {
                const destEx = `${item.dest}.example`;
                const subs = item.subs ?? {};
                await copyTextFile(item.src, destEx, subs);
                logger.log(`Wrote example ${path.relative(cwd, destEx)}`);
              } else {
                logger.log(`Skipped ${path.relative(cwd, item.dest)}`);
              }
            }
          } finally {
            rl.close();
          }
        });
    },
  });
