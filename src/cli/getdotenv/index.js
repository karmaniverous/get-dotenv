#!/usr/bin/env node

// lib imports
import { getDotenvCli } from '../../getDotenvCli.js';

const cli = getDotenvCli();

await cli.parseAsync();
