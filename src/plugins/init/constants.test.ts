import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

import { resolveTemplatesRoot } from './constants';

describe('resolveTemplatesRoot', () => {
  it("is get-dotenv's own templates directory", async () => {
    const root = await resolveTemplatesRoot(import.meta.url);
    expect(path.basename(root)).toBe('templates');
    expect(path.resolve(root, '..')).toBe(path.resolve(process.cwd()));
  });

  it('throws, naming the URL, when no package root is found', async () => {
    const url = pathToFileURL(path.parse(process.cwd()).root).href;
    await expect(resolveTemplatesRoot(url)).rejects.toThrow(
      `Unable to resolve get-dotenv package root from ${url}.`,
    );
  });
});
