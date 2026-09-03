#!/usr/bin/env node
import { fileURLToPath } from 'node:url';

import { createStaticUiHandler } from '../server/staticUi.js';
import { runCli } from './run.js';

const uiDirectory = fileURLToPath(new URL('./ui/', import.meta.url));

runCli(process.argv.slice(2), createStaticUiHandler(uiDirectory)).catch(
  (error: unknown) => {
    const message =
      error instanceof Error ? error.message : 'Unknown startup error.';
    process.stderr.write(`Defftra Router could not start: ${message}\n`);
    process.exitCode = 1;
  },
);
