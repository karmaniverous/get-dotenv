import { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';
import type { Command } from 'commander';

import { helloPlugin } from './plugins/hello';

const program: Command = new GetDotenvCli('__CLI_NAME__').use(helloPlugin());

await (program as unknown as GetDotenvCli).resolveAndLoad();
await program.parseAsync();
