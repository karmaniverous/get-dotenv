/**
 * @packageDocumentation
 * Init plugin subpath. Scaffolds get‑dotenv configuration files and a simple
 * host‑based CLI skeleton with collision handling and CI‑safe defaults.
 */

import { definePlugin } from '@/src/cliHost';

export type { PlanCliCopiesOptions, PlanConfigCopiesOptions } from './plan';

import { attachInitDefaultAction } from './defaultAction';
import { attachInitOptions } from './options';

/**
 * Init plugin: scaffolds configuration files and a CLI skeleton for get-dotenv.
 * Supports collision detection, interactive prompts, and CI bypass.
 */
export const initPlugin = () =>
  definePlugin({
    ns: 'init',
    setup(cli) {
      const initCmd = attachInitOptions(cli);
      attachInitDefaultAction(initCmd);
      return undefined;
    },
  });
