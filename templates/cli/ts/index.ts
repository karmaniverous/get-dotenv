#!/usr/bin/env node
import { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';

import { helloPlugin } from './plugins/hello';

const program = new GetDotenvCli('__CLI_NAME__');

// Normalize help output newlines for deterministic capture (mirrors shipped createCli).
const outputCfg = {
  writeOut(str: string) {
    const txt = typeof str === 'string' ? str : '';
    const hasTwo = /(?:\r?\n){2,}$/.test(txt);
    const hasOne = /\r?\n$/.test(txt);
    const out = hasTwo ? txt : hasOne ? txt + '\n' : txt + '\n\n';
    try {
      process.stdout.write(out);
    } catch {
      /* ignore */
    }
  },
  writeErr(str: string) {
    try {
      process.stderr.write(str);
    } catch {
      /* ignore */
    }
  },
};
program.configureOutput(outputCfg);
const applyOutputRecursively = (cmd: GetDotenvCli) => {
  cmd.configureOutput(outputCfg);
  for (const child of cmd.commands)
    applyOutputRecursively(child as unknown as typeof cmd);
};
applyOutputRecursively(program);

program
  .attachRootOptions({ loadProcess: false })
  .use(helloPlugin())
  .passOptions({ loadProcess: false })
  .action(() => {
    /* no-op to ensure root hooks fire */
  });

await program.brand({
  importMetaUrl: import.meta.url,
  description: '__CLI_NAME__',
});
await program.parseAsync();
