import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';

export function localPwa(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'ege-local-pwa',
    apply: 'build',
    configResolved(value) {
      config = value;
    },
    async closeBundle() {
      if (config.build.ssr) return;
      const directory = resolve(config.root, config.build.outDir);
      // Explicit IDs avoid project Pages installs sharing the root app identity.
      const manifestPath = join(directory, 'manifest.webmanifest');
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
      await writeFile(
        manifestPath,
        JSON.stringify(
          {
            ...manifest,
            id: config.base,
            start_url: config.base,
            scope: config.base,
          },
          null,
          2,
        ) + '\n',
      );
      async function files(relative = ''): Promise<string[]> {
        const entries = await readdir(join(directory, relative), {
          withFileTypes: true,
        });
        const nested = await Promise.all(
          entries.map((entry) =>
            entry.isDirectory()
              ? files(join(relative, entry.name))
              : Promise.resolve([
                  join(relative, entry.name).replaceAll('\\', '/'),
                ]),
          ),
        );
        return nested.flat();
      }
      const paths = (await files())
        .filter((file) => file !== 'sw.js' && !file.endsWith('.map'))
        .sort();
      const hash = createHash('sha256');
      for (const path of paths) {
        hash.update(path);
        hash.update(await readFile(join(directory, path)));
      }
      const version = hash.digest('hex').slice(0, 16);
      const source = await readFile(
        resolve(config.root, 'src/pwa/service-worker.js'),
        'utf8',
      );
      await writeFile(
        join(directory, 'sw.js'),
        source
          .replace('__BUILD_ID__', version)
          .replace(
            '/*__PRECACHE__*/ []',
            JSON.stringify([
              config.base,
              ...paths.map((path) => `${config.base}${path}`),
            ]),
          ),
      );
    },
  };
}
