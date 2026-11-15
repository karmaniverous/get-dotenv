/**
 * Batch services (neutral): resolve command and shell settings.
 * Shared by the generator path and the batch plugin to avoid circular deps.
 */

import type { ScriptsTable } from './types';

/**
 * The script entry named `command`, if the table has one of its own. An
 * inherited object property (`toString`, `constructor`, `__proto__`) is not a
 * script.
 */
const ownScript = <TShell extends string | boolean>(
  scripts: ScriptsTable<TShell> | undefined,
  command: string,
) =>
  scripts !== undefined && Object.hasOwn(scripts, command)
    ? scripts[command]
    : undefined;

/**
 * Resolve a command string from the {@link ScriptsTable} table.
 * A script may be expressed as a string or an object with a `cmd` property.
 * Only the table's own keys are script names: an inherited object property
 * such as `toString` or `constructor` resolves to the command itself.
 *
 * @param scripts - Optional scripts table.
 * @param command - User-provided command name or string.
 * @returns Resolved command string (falls back to the provided command).
 */
export const resolveCommand = (
  scripts: ScriptsTable | undefined,
  command: string,
): string => {
  const script = ownScript(scripts, command);
  if (script === undefined) return command;
  return typeof script === 'string' ? script : script.cmd;
};

/**
 * Resolve the shell setting for a given command:
 * - If the script entry is an object, prefer its `shell` override.
 * - Otherwise use the provided `shell` (string | boolean).
 *
 * Only the table's own keys are script names (see {@link resolveCommand}).
 *
 * @param scripts - Optional scripts table.
 * @param command - User-provided command name or string.
 * @param shell - Global shell preference (string | boolean).
 */
export const resolveShell = <TShell extends string | boolean>(
  scripts: ScriptsTable<TShell> | undefined,
  command: string,
  shell: TShell | undefined,
): TShell | false => {
  const script = ownScript(scripts, command);
  return typeof script === 'object'
    ? (script.shell ?? false)
    : (shell ?? false);
};
