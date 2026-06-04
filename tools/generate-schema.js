/**
 * Generate a JSON Schema from the Zod config schema for IDE IntelliSense.
 *
 * Usage: tsx tools/generate-schema.js
 *
 * Outputs: schema/getdotenv.config.schema.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

// tsx resolves TypeScript path aliases, so we can import directly.
// eslint picks up this file as .js (not .ts), avoiding tsconfig project issues.
import { getDotenvCliOptionsSchemaRaw } from '../src/schema/getDotenvCliOptions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Rebuild the config schema with `logger` omitted — it is a runtime-only
// field (defaults to `console`) that has no meaning in JSON/YAML configs.
const cliOptionsForConfig = getDotenvCliOptionsSchemaRaw.omit({ logger: true });

const configSchema = z.object({
  rootOptionDefaults: cliOptionsForConfig.optional(),
  rootOptionVisibility: z.record(z.string(), z.boolean()).optional(),
  scripts: z.record(z.string(), z.unknown()).optional(),
  requiredKeys: z.array(z.string()).optional(),
  schema: z.unknown().optional(),
  vars: z.record(z.string(), z.string()).optional(),
  envVars: z.record(z.string(), z.record(z.string(), z.string())).optional(),
  dynamic: z.unknown().optional(),
  plugins: z.record(z.string(), z.unknown()).optional(),
});

const jsonSchema = z.toJSONSchema(configSchema, {
  target: 'draft-2020-12',
});

// Augment with metadata
const output = {
  ...jsonSchema,
  $id: 'https://raw.githubusercontent.com/karmaniverous/get-dotenv/main/schema/getdotenv.config.schema.json',
  title: 'get-dotenv Configuration',
  description:
    'Schema for getdotenv.config.json configuration files. See https://github.com/karmaniverous/get-dotenv',
};

const outDir = path.join(rootDir, 'schema');
fs.mkdirSync(outDir, { recursive: true });

const outPath = path.join(outDir, 'getdotenv.config.schema.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');

console.log(`✅ JSON Schema written to ${path.relative(rootDir, outPath)}`);
