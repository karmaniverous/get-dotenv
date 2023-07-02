#!/usr/bin/env node

// lib imports
import { getCli } from '../../lib/getCli.js';

const cli = getCli();

await cli.parseAsync();
