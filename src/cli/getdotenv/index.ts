#!/usr/bin/env node

import type { Command } from 'commander';

import { generateGetDotenvCli } from '../../';

const program: Command = await generateGetDotenvCli({
  importMetaUrl: import.meta.url,
});

await program.parseAsync();
