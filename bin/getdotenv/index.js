#!/usr/bin/env node

// lib imports
import { getDotenvCli } from '../../lib/getDotenvCli.js';

const cli = getDotenvCli();

await cli.parseAsync();
