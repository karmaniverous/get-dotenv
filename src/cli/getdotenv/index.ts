#!/usr/bin/env node

import { createCli } from '../createCli';

// Delegate to the canonical host factory.
await createCli({ alias: 'getdotenv' })();
