import { chmod, copyFile, readFile, writeFile } from 'node:fs/promises';

await chmod(new URL('../dist/defftra-router.mjs', import.meta.url), 0o755);
const windowsLauncher = await readFile(
  new URL('./run-windows.cmd', import.meta.url),
  'utf8',
);
await writeFile(
  new URL('../dist/run-windows.cmd', import.meta.url),
  windowsLauncher.replace(/\r?\n/g, '\r\n'),
  'utf8',
);
await copyFile(
  new URL('./run-macos.command', import.meta.url),
  new URL('../dist/run-macos.command', import.meta.url),
);
await chmod(new URL('../dist/run-macos.command', import.meta.url), 0o755);
