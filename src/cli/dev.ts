import { fileURLToPath } from 'node:url';

import { createServer as createViteServer } from 'vite';

import type { ManagementUiHandler } from '../server/appServer.js';
import { runCli } from './run.js';

const vite = await createViteServer({
  configFile: fileURLToPath(new URL('../../vite.config.ts', import.meta.url)),
  server: { middlewareMode: true },
  appType: 'spa',
});

const viteHandler: ManagementUiHandler = (request, response) =>
  new Promise((resolve, reject) => {
    vite.middlewares(request, response, (error?: unknown) => {
      if (error)
        reject(
          error instanceof Error ? error : new Error('Vite middleware failed.'),
        );
      else resolve(response.writableEnded);
    });
    response.once('finish', () => resolve(true));
  });

await runCli(process.argv.slice(2), viteHandler, () => vite.close());
