/**
 * The host root a `GetDotenvCli` carries (Decision 23).
 *
 * A host's root is the package root above its `import.meta.url`. It supplies
 * the packaged config layer. `createCli` sets it from its required
 * `importMetaUrl`; a host that builds `GetDotenvCli` directly sets it through
 * the constructor or `brand({ importMetaUrl })`, and the last one given wins.
 * A direct host that gives neither keeps get-dotenv's own package root, as in
 * 7.x.
 *
 * Every config discovery a host makes (`createCli`'s top-level help, the root
 * hooks, `resolveAndLoad`) reads the URL from here.
 */
import type { CommandUnknownOpts } from '@commander-js/extra-typings';

import { getRootCommand } from './getRootCommand';

/** get-dotenv's own module URL: the host root of a host that sets none. */
const OWN_META_URL = import.meta.url;

const HOST_META_URLS = new WeakMap<object, string>();

/**
 * Set the host's `import.meta.url` on the root of `cli`.
 *
 * @param cli - The host, or any command under it.
 * @param importMetaUrl - The host module's `import.meta.url`.
 */
export const setHostMetaUrl = (
  cli: CommandUnknownOpts,
  importMetaUrl: string,
): void => {
  HOST_META_URLS.set(getRootCommand(cli), importMetaUrl);
};

/**
 * The host's `import.meta.url`: the one set on the root of `cli`, else
 * get-dotenv's own.
 *
 * @param cli - The host, or any command under it.
 * @returns The URL whose package root is the host root.
 */
export const hostMetaUrlOf = (cli: CommandUnknownOpts): string =>
  HOST_META_URLS.get(getRootCommand(cli)) ?? OWN_META_URL;
