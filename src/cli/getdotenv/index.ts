#!/usr/bin/env node

import { createCli } from '../../index';

// Delegate to the canonical host factory.
await createCli({ alias: 'getdotenv' }).run(process.argv.slice(2));
