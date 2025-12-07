/**
 * Requirements: Init scaffolding plugin with collision flow and CI detection.
 * Note: Large file scheduled for decomposition; tracked in stan.todo.md.
 */
import { stdin as input, stdout as output } from 'node:process';

// NOTE: pay attention to non-interactive detection and precedence
// (--force > --yes > auto-detect). See README for details.
import fs from 'fs-extra';
import path from 'path';
import { createInterface } from 'readline/promises';

import { definePlugin } from '@/src/cliHost/definePlugin';
import type { Logger } from '@/src/GetDotenvOptions';

import { copyTextFile, ensureLines } from './io';
import { planCliCopies, planConfigCopies } from './plan';
import { isNonInteractive, promptDecision } from './prompts';
export type InitPluginOptions = {
  logger?: Logger;
};
type CopyDecision = 'overwrite' | 'example' | 'skip';

export const initPlugin = (opts: InitPluginOptions = {}) =>
  definePlugin({
    id: 'init',
    setup(cli) {
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
          const o = (cmd.opts() as Record<string, unknown> | undefined) ?? {};
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

            // Ensure .gitignore includes local config patterns.
            const giPath = path.join(destRoot, '.gitignore');
            const { created, changed } = await ensureLines(giPath, [
              'getdotenv.config.local.*',
              '*.local',
            ]);
            if (created) {
              logger.log(`Created ${path.relative(cwd, giPath)}`);
            } else if (changed) {
              logger.log(`Updated ${path.relative(cwd, giPath)}`);
            }
          } finally {
            rl.close();
          }
        });
    },
  });
