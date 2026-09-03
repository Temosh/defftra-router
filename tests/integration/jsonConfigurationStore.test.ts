import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIGURATION } from '../../src/core/configuration.js';
import { JsonConfigurationStore } from '../../src/persistence/jsonConfigurationStore.js';

describe('JsonConfigurationStore', () => {
  it('writes and reloads human-readable versioned JSON', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'defftra-router-'));
    const path = join(directory, 'nested', 'config.json');
    const store = new JsonConfigurationStore(path);
    await store.save(DEFAULT_CONFIGURATION);
    await expect(store.load()).resolves.toEqual(DEFAULT_CONFIGURATION);
    expect(await readFile(path, 'utf8')).toContain('\n  "schemaVersion": 1,');
  });
});
