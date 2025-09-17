#!/usr/bin/env node

import '../../cliCore/enhanceGetDotenvCli';

import { GetDotenvCli } from '../../cliHost/GetDotenvCli';
import type { GetDotenvOptions } from '../../GetDotenvOptions';
import { batchPlugin } from '../../plugins/batch';
import { cmdPlugin } from '../../plugins/cmd';
import { initPlugin } from '../../plugins/init';

// Shipped CLI rebased on plugin-first host.
const program: GetDotenvCli = new GetDotenvCli<GetDotenvOptions>('getdotenv')
  .attachRootOptions()
  .use(cmdPlugin({ asDefault: true }))
  .use(batchPlugin())
  .use(initPlugin())
  .passOptions();

await program.parseAsync();
