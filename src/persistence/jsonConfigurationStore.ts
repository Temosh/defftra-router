import { constants } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

import type { Configuration } from '../core/configuration.js';
import type { ConfigurationStore } from '../core/configurationService.js';

export function resolveDefaultConfigurationPath(
  platform = process.platform,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  if (platform === 'win32') {
    const base = environment.LOCALAPPDATA ?? environment.APPDATA;
    if (!base)
      throw new Error('Neither LOCALAPPDATA nor APPDATA is available.');
    return join(base, 'Defftra Router', 'config.json');
  }
  if (platform === 'darwin') {
    return join(
      homedir(),
      'Library',
      'Application Support',
      'Defftra Router',
      'config.json',
    );
  }
  const base = environment.XDG_CONFIG_HOME ?? join(homedir(), '.config');
  return join(base, 'defftra-router', 'config.json');
}

export class JsonConfigurationStore implements ConfigurationStore {
  readonly #path: string;

  constructor(path = resolveDefaultConfigurationPath()) {
    this.#path = path;
  }

  get path(): string {
    return this.#path;
  }

  async load(): Promise<unknown> {
    try {
      return JSON.parse(await readFile(this.#path, 'utf8')) as unknown;
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') return null;
      throw error;
    }
  }

  async save(configuration: Configuration): Promise<void> {
    const directory = dirname(this.#path);
    await mkdir(directory, { recursive: true });
    const temporaryPath = `${this.#path}.${process.pid}.${randomUUID()}.tmp`;
    let handle: Awaited<ReturnType<typeof open>> | null = null;
    try {
      handle = await open(
        temporaryPath,
        constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
        0o600,
      );
      await handle.writeFile(
        `${JSON.stringify(configuration, null, 2)}\n`,
        'utf8',
      );
      await handle.sync();
      await handle.close();
      handle = null;
      await rename(temporaryPath, this.#path);
      const directoryHandle = await open(directory, constants.O_RDONLY);
      try {
        await directoryHandle.sync();
      } finally {
        await directoryHandle.close();
      }
    } catch (error) {
      if (handle !== null) await handle.close().catch(() => undefined);
      await unlink(temporaryPath).catch(() => undefined);
      throw error;
    }
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
