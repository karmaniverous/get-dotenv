import fs from 'fs-extra';
import path from 'path';
import { describe, expect, it } from 'vitest';

import {
  discoverConfigFiles,
  loadConfigFile,
  resolveGetDotenvConfigSources,
  toFileUrl,
} from './loader';

const TROOT = path.posix.join('.tsbuild', 'getdotenv-config-tests');
const PP = path.posix.join(TROOT, 'packaged');
const PR = path.posix.join(TROOT, 'project');

const writeJson = async (p: string, v: unknown) =>
  fs.writeFile(p, JSON.stringify(v, null, 2), 'utf-8');

describe('config/loader (JSON/YAML)', () => {
  it('discovers packaged and project configs in order', async () => {
    // Setup: packaged root with package.json and public config
    await fs.ensureDir(PP);
    await writeJson(path.posix.join(PP, 'package.json'), { name: 'pkg' });
    await writeJson(path.posix.join(PP, 'getdotenv.config.json'), {
      vars: { A: '1' },
    });

    // Setup: project root with package.json and public + local configs
    await fs.ensureDir(PR);
    await writeJson(path.posix.join(PR, 'package.json'), { name: 'proj' });
    await writeJson(path.posix.join(PR, 'getdotenv.config.yaml'), {
      vars: { B: '2' },
    });
    await fs.writeFile(
      path.posix.join(PR, 'getdotenv.config.local.yml'),
      'vars:\n  C: "3"\n',
      'utf-8',
    );

    // Point packaged discovery via importMetaUrl
    const packagedFileUrl = toFileUrl(path.posix.join(PP, 'index.mjs'));

    // For project, ensure packageDirectory() resolves to our test project root
    const cwdOrig = process.cwd();
    process.chdir(PR);
    try {
      const files = await discoverConfigFiles(packagedFileUrl);
      // Should see: packaged public, project public, project local
      expect(files.map((f) => [f.scope, f.privacy])).toEqual([
        ['packaged', 'public'],
        ['project', 'public'],
        ['project', 'local'],
      ]);

      const sources = await resolveGetDotenvConfigSources(packagedFileUrl);
      expect(sources.packaged?.vars?.A).toBe('1');
      expect(sources.project?.public?.vars?.B).toBe('2');
      expect(sources.project?.local?.vars?.C).toBe('3');
    } finally {
      process.chdir(cwdOrig);
      await fs.remove(TROOT);
    }
  });

  it('parses JSON and YAML, rejects JS/TS and dynamic in JSON/YAML', async () => {
    await fs.ensureDir(PR);
    await writeJson(path.posix.join(PR, 'package.json'), { name: 'proj' });
    const jsonPath = path.posix.join(PR, 'getdotenv.config.json');
    await writeJson(jsonPath, { vars: { X: '1' } });
    const yamlPath = path.posix.join(PR, 'getdotenv.config.yaml');
    await fs.writeFile(yamlPath, 'vars:\n  Y: "2"\n', 'utf-8');

    const jsonCfg = await loadConfigFile(jsonPath);
    expect(jsonCfg.vars?.X).toBe('1');
    const yamlCfg = await loadConfigFile(yamlPath);
    expect(yamlCfg.vars?.Y).toBe('2');

    // Reject JS/TS
    const jsPath = path.posix.join(PR, 'getdotenv.config.js');
    await fs.writeFile(jsPath, 'export default {}', 'utf-8');
    await expect(loadConfigFile(jsPath)).rejects.toThrow(/not supported/i);

    // Reject dynamic in JSON/YAML for this step
    await writeJson(jsonPath, { dynamic: { KEY: 'VAL' } });
    await expect(loadConfigFile(jsonPath)).rejects.toThrow(/dynamic/i);

    await fs.remove(TROOT);
  });
});
