#!/usr/bin/env node

import { generateGetDotenvCli } from '../../';

const cli = generateGetDotenvCli();

await cli.parseAsync();
