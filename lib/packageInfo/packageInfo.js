import path from 'path';
import { packageDirectory } from 'pkg-dir';
import slash from 'slash';

// __dirname
import { URL, fileURLToPath } from 'url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * @ignore
 * @async
 * @function packageInfo
 *
 * @returns {Object} package info
 */
export const packageInfo = async () => {
  const pkgDir = await packageDirectory();
  const relDir = slash(
    path.relative(__dirname, path.resolve(pkgDir, 'package.json'))
  );

  const { default: pkg } = await import(relDir, {
    assert: {
      type: 'json',
    },
  });

  const { type, version } = pkg;

  return { type, version };
};
