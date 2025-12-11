#!/usr/bin/env node

import { createCli } from '@karmaniverous/get-dotenv/cli';

import {
  awsPlugin,
  awsWhoamiPlugin,
  batchPlugin,
  cmdPlugin,
  initPlugin,
} from '@/src/plugins';

import { helloPlugin } from './plugins/hello';

await createCli({
  alias: 'mycli',
  compose: (program) =>
    program
      .overrideRootOptions({ loadProcess: false })
      .use(
        cmdPlugin({ asDefault: true, optionAlias: '-c, --cmd <command...>' }),
      )
      .use(batchPlugin())
      .use(awsPlugin().use(awsWhoamiPlugin()))
      .use(initPlugin())
      .use(helloPlugin())
      .passOptions({ loadProcess: false }),
})();
