#!/usr/bin/env node

import '../../cliCore/enhanceGetDotenvCli';

import { GetDotenvCli } from '../../cliHost/GetDotenvCli';
import type { GetDotenvOptions } from '../../GetDotenvOptions';
import { awsPlugin } from '../../plugins/aws';
import { batchPlugin } from '../../plugins/batch';
import { cmdPlugin } from '../../plugins/cmd';
import { demoPlugin } from '../../plugins/demo';
import { initPlugin } from '../../plugins/init';
// Shipped CLI rebased on plugin-first host.
const program: GetDotenvCli = new GetDotenvCli<GetDotenvOptions>('getdotenv')
  .attachRootOptions({ loadProcess: false })
  .use(cmdPlugin({ asDefault: true, optionAlias: '-c, --cmd <command...>' }))
  .use(batchPlugin())
  .use(awsPlugin())
  .use(demoPlugin())
  .use(initPlugin())
  .passOptions({ loadProcess: false });
await program.parseAsync();
