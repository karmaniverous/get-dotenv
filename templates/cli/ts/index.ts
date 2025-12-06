import { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';

import { helloPlugin } from './plugins/hello';

const program = new GetDotenvCli('__CLI_NAME__').use(helloPlugin());

await program.resolveAndLoad();
await program.parseAsync();
