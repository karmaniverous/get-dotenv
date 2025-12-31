import path from 'node:path';

import fs from 'fs-extra';
import { describe, expect, it } from 'vitest';

import { editDotenvFile } from './editDotenvFile';

const ROOT = path.resolve(
  '.tsbuild',
  `dotenv-edit-file-tests.${String(process.pid)}.${process.env.VITEST_WORKER_ID ?? '0'}`,
);

const mk = async (p: string) => {
  await fs.ensureDir(p);
  return p;
};

describe('dotenv/edit/editDotenvFile', () => {
  it('selects the first existing target by default using reverse path order', async () => {
    const d1 = await mk(path.join(ROOT, 'case1', 'p1'));
    const d2 = await mk(path.join(ROOT, 'case1', 'p2'));

    // Same target exists in both paths; reverse order should pick p2.
    await fs.writeFile(path.join(d1, '.env'), 'A=from1\n', 'utf-8');
    await fs.writeFile(path.join(d2, '.env'), 'A=from2\n', 'utf-8');

    const res = await editDotenvFile(
      { A: 'updated' },
      { paths: [d1, d2], scope: 'global', privacy: 'public' },
    );
    expect(res.path).toBe(path.resolve(d2, '.env'));
    const txt = await fs.readFile(res.path, 'utf-8');
    expect(txt).toBe('A=updated\n');
  });

  it('supports forward search order', async () => {
    const d1 = await mk(path.join(ROOT, 'case2', 'p1'));
    const d2 = await mk(path.join(ROOT, 'case2', 'p2'));
    await fs.writeFile(path.join(d1, '.env'), 'A=from1\n', 'utf-8');
    await fs.writeFile(path.join(d2, '.env'), 'A=from2\n', 'utf-8');

    const res = await editDotenvFile(
      { A: 'updated' },
      {
        paths: [d1, d2],
        scope: 'global',
        privacy: 'public',
        searchOrder: 'forward',
      },
    );
    expect(res.path).toBe(path.resolve(d1, '.env'));
    const txt = await fs.readFile(res.path, 'utf-8');
    expect(txt).toBe('A=updated\n');
  });

  it('bootstraps from a template when target is missing', async () => {
    const d = await mk(path.join(ROOT, 'case3', 'p'));
    // Target is ".env.local", template is ".env.local.template"
    await fs.writeFile(
      path.join(d, '.env.local.template'),
      'A=tmpl\n',
      'utf-8',
    );

    const res = await editDotenvFile(
      { A: 'updated' },
      {
        paths: [d],
        scope: 'global',
        privacy: 'private',
        privateToken: 'local',
      },
    );
    expect(res.createdFromTemplate).toBe(true);
    expect(res.path).toBe(path.resolve(d, '.env.local'));
    const txt = await fs.readFile(res.path, 'utf-8');
    expect(txt).toBe('A=updated\n');
  });

  it('throws when env-scoped selection is requested without an env', async () => {
    const d = await mk(path.join(ROOT, 'case4', 'p'));
    await fs.writeFile(path.join(d, '.env'), 'A=1\n', 'utf-8');

    await expect(
      editDotenvFile(
        { A: 'x' },
        { paths: [d], scope: 'env', privacy: 'public' },
      ),
    ).rejects.toThrow(/env is required/i);
  });
});
