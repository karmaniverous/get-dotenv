import { stdin as input, stdout as output } from 'node:process';

// NOTE: pay attention to non-interactive detection and precedence
// (--force > --yes > auto-detect). See README for details.
import fs from 'fs-extra';
import path from 'path';
import { createInterface } from 'readline/promises';

import { type GetDotenvCliPublic, readMergedOptions } from '@/src/cliHost';

import { copyTextFile, ensureLines } from './io';
import { type CopyOperation, planCliCopies, planConfigCopies } from './plan';
import { isNonInteractive, promptDecision } from './prompts';

type CopyDecision = 'overwrite' | 'example' | 'skip';

/**
 * Attach the init plugin default action.
 *
 * @param cli - The `init` command mount.
 *
 * @internal
 */
export function attachInitDefaultAction(cli: GetDotenvCliPublic): void {
  cli.action(async (destArg, opts, thisCommand) => {
    // Inherit logger from merged root options (base).
    const bag = readMergedOptions(thisCommand);
    const logger = bag.logger;

    const destRel =
      typeof destArg === 'string' && destArg.length > 0 ? destArg : '.';
    const cwd = process.cwd();
    const destRoot = path.resolve(cwd, destRel);

    const formatInput = (opts as { configFormat?: unknown }).configFormat;
    const formatRaw =
      typeof formatInput === 'string' ? formatInput.toLowerCase() : 'json';
    const format = (
      ['json', 'yaml', 'js', 'ts'].includes(formatRaw) ? formatRaw : 'json'
    ) as 'json' | 'yaml' | 'js' | 'ts';
    const withLocal = Boolean((opts as { withLocal?: unknown }).withLocal);
    // dynamic flag reserved for future template variants; present for UX compatibility
    void (opts as { dynamic?: unknown }).dynamic;

    // CLI name default: --cli-name | basename(dest) | 'mycli'
    const cliNameInput = (opts as { cliName?: unknown }).cliName;
    const cliName =
      (typeof cliNameInput === 'string' && cliNameInput.length > 0
        ? cliNameInput
        : path.basename(destRoot) || 'mycli') || 'mycli';

    // Precedence: --force > --yes > auto-detect(non-interactive => yes)
    const force = Boolean((opts as { force?: unknown }).force);
    const yes =
      Boolean((opts as { yes?: unknown }).yes) ||
      (!force && isNonInteractive());

    // Build copy plan
    const cfgCopies = planConfigCopies({ format, withLocal, destRoot });
    const cliCopies = planCliCopies({ cliName, destRoot });
    const copies: Array<CopyOperation> = [...cfgCopies, ...cliCopies];

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
            decision = a === 'o' ? 'overwrite' : a === 'e' ? 'example' : 'skip';
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
}
