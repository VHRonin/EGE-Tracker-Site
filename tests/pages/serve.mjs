// Strict static hosting for QA: only the project subdirectory exists, with no SPA fallback.
import { createServer } from 'node:http';
import { URL } from 'node:url';
import { stdout } from 'node:process';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve('dist-pages');
const prefix = '/ege-tracker/';
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};
const server = createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(
      new URL(request.url ?? '/', 'http://localhost').pathname,
    );
    if (!path.startsWith(prefix)) {
      response.writeHead(404).end();
      return;
    }
    const file = resolve(root, path.slice(prefix.length) || 'index.html');
    if (!file.startsWith(root + sep)) {
      response.writeHead(404).end();
      return;
    }
    const contents = await readFile(file);
    response.writeHead(200, {
      'Content-Type': types[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    response.end(contents);
  } catch {
    response.writeHead(404).end();
  }
});
server.listen(4175, '127.0.0.1', () => {
  stdout.write('Pages QA: http://127.0.0.1:4175/ege-tracker/\n');
});
