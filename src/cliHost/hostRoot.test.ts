/**
 * The host root a GetDotenvCli carries (Decision 23, #52).
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

import { resolvePackageRoot } from '@/src/util/packageRoot';

import { GetDotenvCli } from './GetDotenvCli';
import { hostMetaUrlOf, setHostMetaUrl } from './hostRoot';

const GETDOTENV_ROOT = path.resolve(import.meta.dirname, '..', '..');
const otherUrl = pathToFileURL(
  path.join(GETDOTENV_ROOT, 'test', 'x', 'cli.js'),
).href;

describe('hostMetaUrlOf / setHostMetaUrl', () => {
  it("a host that sets none has get-dotenv's own root", async () => {
    const cli = new GetDotenvCli('h');
    expect(await resolvePackageRoot(hostMetaUrlOf(cli))).toBe(GETDOTENV_ROOT);
  });

  it('is stored on the root and read from any command under it', () => {
    const cli = new GetDotenvCli('h');
    const child = cli.command('child');
    const grandchild = child.command('leaf');
    setHostMetaUrl(grandchild, otherUrl);
    expect(hostMetaUrlOf(cli)).toBe(otherUrl);
    expect(hostMetaUrlOf(child)).toBe(otherUrl);
  });

  it('the constructor sets it and a later brand() replaces it', async () => {
    const cli = new GetDotenvCli('h', { importMetaUrl: otherUrl });
    expect(hostMetaUrlOf(cli)).toBe(otherUrl);
    await cli.brand({ importMetaUrl: import.meta.url, version: '1.0.0' });
    expect(hostMetaUrlOf(cli)).toBe(import.meta.url);
    // brand() without a URL leaves it alone.
    await cli.brand({ version: '1.0.1' });
    expect(hostMetaUrlOf(cli)).toBe(import.meta.url);
  });

  it('hosts are independent', () => {
    const a = new GetDotenvCli('a', { importMetaUrl: otherUrl });
    const b = new GetDotenvCli('b');
    expect(hostMetaUrlOf(a)).toBe(otherUrl);
    expect(hostMetaUrlOf(b)).not.toBe(otherUrl);
  });
});
