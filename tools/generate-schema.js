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

import { format, resolveConfig } from 'prettier';
import { z } from 'zod';

// tsx resolves TypeScript path aliases, so we can import directly.
// eslint picks up this file as .js (not .ts), avoiding tsconfig project issues.
// The config schema is the loader's own (rootOptionDefaults rejects the
// programmatic `dynamic` and `logger`), so the IDE schema can't drift from it.
import { getDotenvConfigSchemaRaw } from '../src/schema/getDotenvConfig.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const jsonSchema = z.toJSONSchema(getDotenvConfigSchemaRaw, {
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
// Format with the repo's Prettier config so the committed file passes lint.
const prettierConfig = (await resolveConfig(outPath)) ?? {};
fs.writeFileSync(
  outPath,
  await format(JSON.stringify(output, null, 2), {
    ...prettierConfig,
    parser: 'json',
  }),
);

console.log(`✅ JSON Schema written to ${path.relative(rootDir, outPath)}`);
