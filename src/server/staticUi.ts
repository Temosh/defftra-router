import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

import type { ManagementUiHandler } from './appServer.js';

const contentTypes: Readonly<Record<string, string>> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

export function createStaticUiHandler(
  rootDirectory: string,
): ManagementUiHandler {
  const root = resolve(rootDirectory);
  return async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') return false;
    const url = new URL(request.url ?? '/', 'http://router.localhost');
    const requestedPath = normalize(decodeURIComponent(url.pathname)).replace(
      /^(\.\.[/\\])+/,
      '',
    );
    let path = join(root, requestedPath === '/' ? 'index.html' : requestedPath);
    if (!path.startsWith(root)) return false;
    try {
      if (!(await stat(path)).isFile()) path = join(root, 'index.html');
      const body = await readFile(path);
      response.statusCode = 200;
      response.setHeader(
        'content-type',
        contentTypes[extname(path)] ?? 'application/octet-stream',
      );
      response.setHeader('x-content-type-options', 'nosniff');
      response.setHeader(
        'content-security-policy',
        "default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'",
      );
      if (path.endsWith('index.html'))
        response.setHeader('cache-control', 'no-cache');
      else
        response.setHeader(
          'cache-control',
          'public, max-age=31536000, immutable',
        );
      response.end(request.method === 'HEAD' ? undefined : body);
      return true;
    } catch {
      return false;
    }
  };
}
