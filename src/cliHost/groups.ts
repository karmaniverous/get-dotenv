import type { Option } from '@commander-js/extra-typings';

/**
 * Registry for option grouping: `base`, `app` or `plugin:<ns>`.
 * Host help (`hostHelp.ts`) lists `app` and `plugin:<ns>` options in their
 * own sections between "Options" and "Commands".
 */
export const GROUP_TAG = new WeakMap<Option, string>();
