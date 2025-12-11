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
  rootOptionDefaults: { loadProcess: false },
  compose: (program) =>
    program
      .use(
        cmdPlugin({ asDefault: true, optionAlias: '-c, --cmd <command...>' }),
      )
      .use(batchPlugin())
      .use(awsPlugin().use(awsWhoamiPlugin()))
      .use(initPlugin())
      .use(helloPlugin()),
})();
