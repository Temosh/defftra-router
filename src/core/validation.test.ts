import { describe, expect, it } from 'vitest';

import { CONFIG_SCHEMA_VERSION } from './configuration.js';
import {
  ConfigurationValidationError,
  validateConfiguration,
} from './validation.js';

function validConfiguration(): unknown {
  return {
    schemaVersion: CONFIG_SCHEMA_VERSION,
    listener: { host: '127.0.0.1', port: 8088 },
    routes: [
      {
        id: 'route-1',
        displayName: 'Example',
        hostname: 'Example.Localhost',
        target: 'http://127.0.0.1:3000',
        enabled: true,
        transformations: [{ operation: 'SET', name: 'X-Mode', value: 'test' }],
      },
    ],
    groupDisplayNames: [],
  };
}

describe('validateConfiguration', () => {
  it('normalizes hostname, target, and header names', () => {
    const configuration = validateConfiguration(validConfiguration());
    expect(configuration.routes[0]).toMatchObject({
      hostname: 'example.localhost',
      target: 'http://127.0.0.1:3000/',
      transformations: [{ operation: 'SET', name: 'x-mode', value: 'test' }],
    });
  });

  it('rejects duplicate normalized hostnames', () => {
    const candidate = validConfiguration() as {
      routes: Array<Record<string, unknown>>;
    };
    candidate.routes.push({
      ...candidate.routes[0],
      id: 'route-2',
      hostname: 'EXAMPLE.localhost',
    });
    expect(() => validateConfiguration(candidate)).toThrow(
      ConfigurationValidationError,
    );
  });

  it('rejects non-HTTP upstreams and the management hostname', () => {
    const candidate = validConfiguration() as {
      routes: Array<Record<string, unknown>>;
    };
    candidate.routes[0] = {
      ...candidate.routes[0],
      hostname: 'router.localhost',
      target: 'https://example.test',
    };
    expect(() => validateConfiguration(candidate)).toThrow(
      ConfigurationValidationError,
    );
  });
});
