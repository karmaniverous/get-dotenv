#!/usr/bin/env node

import { createCli } from '@/src/cliHost';

// Delegate to the canonical host factory.
await createCli({ alias: 'getdotenv' })();
