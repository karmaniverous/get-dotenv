import { z } from 'zod';

import type { ScriptsTable } from '@/src/cliHost';

export type BatchPluginOptions = {
  scripts?: ScriptsTable;
  shell?: string | boolean;
};

// Per-plugin config schema (optional fields; used as defaults).
export const ScriptSchema = z.union([
  z.string(),
  z.object({
    cmd: z.string(),
    shell: z.union([z.string(), z.boolean()]).optional(),
  }),
]);

export const BatchConfigSchema = z.object({
  scripts: z.record(z.string(), ScriptSchema).optional(),
  shell: z.union([z.string(), z.boolean()]).optional(),
  rootPath: z.string().optional(),
  globs: z.string().optional(),
  pkgCwd: z.boolean().optional(),
});
export type BatchConfig = z.infer<typeof BatchConfigSchema>;
