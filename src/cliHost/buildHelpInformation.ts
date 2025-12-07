/** src/cliHost/buildHelpInformation.ts
 * Compose root/parent help output by inserting grouped sections between
 * Options and Commands and ensuring a trailing blank line.
 */
import type { CommandUnknownOpts } from '@commander-js/extra-typings';

import { renderOptionGroups } from './groups';

export function buildHelpInformation(
  base: string,
  cmd: CommandUnknownOpts,
): string {
  const groups = renderOptionGroups(cmd);
  const block = typeof groups === 'string' ? groups.trim() : '';
  if (!block) {
    return base.endsWith('\n\n')
      ? base
      : base.endsWith('\n')
        ? `${base}\n`
        : `${base}\n\n`;
  }
  const marker = '\nCommands:';
  const idx = base.indexOf(marker);
  let out = base;
  if (idx >= 0) {
    const toInsert = groups.startsWith('\n') ? groups : `\n${groups}`;
    out = `${base.slice(0, idx)}${toInsert}${base.slice(idx)}`;
  } else {
    const sep = base.endsWith('\n') || groups.startsWith('\n') ? '' : '\n';
    out = `${base}${sep}${groups}`;
  }
  return out.endsWith('\n\n')
    ? out
    : out.endsWith('\n')
      ? `${out}\n`
      : `${out}\n\n`;
}
