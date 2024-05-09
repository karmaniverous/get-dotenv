#!/usr/bin/env node

import { generateGetDotenvCli } from '../../';

const cli = await generateGetDotenvCli({ importMetaUrl: import.meta.url });

await cli.parseAsync();
