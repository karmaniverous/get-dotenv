/**
 * `-V, --version` registered once per command (#87, Decision 23 addendum).
 *
 * Commander's `version(str)` registers the option on every call, so a second
 * call throws `Cannot add option '-V, --version'`, and its handler prints the
 * string it was first given. {@link setVersion} registers the option the
 * first time only and swaps in a handler that prints the current version, so
 * a later call just updates the version.
 *
 * Two private Commander members are used, checked against commander 15 by
 * `versionOption.commanderPrivate.test.ts`: `_version` (what `version()`
 * returns) and `_exit` (the exit path that honours `exitOverride`).
 */
import type { EventEmitter } from 'node:events';

import type { CommandUnknownOpts } from '@commander-js/extra-typings';

/** The private Commander members this module relies on. */
interface CommanderVersionSlots {
  _version?: string;
  _exit: (exitCode: number, code: string, message: string) => void;
}

const VERSION_EVENT = 'option:version';

const REGISTERED = new WeakSet<CommandUnknownOpts>();

/**
 * Set the version `-V, --version` prints, registering the option on the first
 * call only.
 *
 * @param cmd - The command (the host root).
 * @param version - The version string.
 */
export const setVersion = (cmd: CommandUnknownOpts, version: string): void => {
  const slots = cmd as unknown as CommanderVersionSlots;
  if (REGISTERED.has(cmd)) {
    slots._version = version;
    return;
  }
  // A Commander Command is an EventEmitter (extra-typings declares only on()).
  const emitter = cmd as unknown as EventEmitter;
  const before = new Set(emitter.listeners(VERSION_EVENT));
  cmd.version(version);
  REGISTERED.add(cmd);
  // Replace Commander's handler (it prints the string it was first given).
  for (const l of emitter.listeners(VERSION_EVENT))
    if (!before.has(l))
      emitter.removeListener(VERSION_EVENT, l as (...args: unknown[]) => void);
  emitter.on(VERSION_EVENT, () => {
    const current = String(cmd.version());
    cmd.configureOutput().writeOut?.(`${current}\n`);
    slots._exit(0, 'commander.version', current);
  });
};
