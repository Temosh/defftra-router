import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import net, { type AddressInfo } from 'node:net';
import type { Duplex } from 'node:stream';

import { afterEach, describe, expect, it } from 'vitest';

import type { Configuration } from '../../src/core/configuration.js';
import { CONFIG_SCHEMA_VERSION } from '../../src/core/configuration.js';
import {
  ConfigurationService,
  type ConfigurationStore,
} from '../../src/core/configurationService.js';
import { createAppServer, type AppServer } from '../../src/server/appServer.js';

const applications: AppServer[] = [];
const upstreams: http.Server[] = [];
const upgradedUpstreamSockets = new Set<Duplex>();

afterEach(async () => {
  for (const socket of upgradedUpstreamSockets) socket.destroy();
  upgradedUpstreamSockets.clear();
  await Promise.all(
    applications.splice(0).map((application) => application.close()),
  );
  await Promise.all(
    upstreams
      .splice(0)
      .map(
        (server) =>
          new Promise<void>((resolve) => server.close(() => resolve())),
      ),
  );
});

describe('application server', () => {
  it('serves the management UI on router.localhost', async () => {
    const service = new ConfigurationService(
      new MemoryStore(),
      configuration(3000),
    );
    const application = createAppServer({
      configurationService: service,
      managementUiHandler: (_request, response) => {
        response.statusCode = 200;
        response.end('management UI');
        return Promise.resolve(true);
      },
    });
    applications.push(application);
    const port = await application.listen('127.0.0.1', 0);

    const management = await request(port, 'router.localhost');
    const previousHostname = await request(port, 'defftra.localhost');

    expect(management).toMatchObject({ status: 200, body: 'management UI' });
    expect(previousHostname.status).toBe(404);
    expect(previousHostname.body).toContain('Route not found');
  });

  it('streams path, query, body, status, response headers, and transformed request headers', async () => {
    const upstream = await listenUpstream((request, response) => {
      response.statusCode = 201;
      response.setHeader('x-upstream', 'yes');
      request.pipe(response);
    });
    const { application, port } = await listenApplication(
      configuration(upstream.port),
    );
    applications.push(application);

    const result = await request(
      port,
      'flow.localhost',
      '/base?mode=one',
      'POST',
      'streamed body',
      {
        'x-input': 'first',
      },
    );
    expect(result).toMatchObject({ status: 201, body: 'streamed body' });
    expect(result.headers['x-upstream']).toBe('yes');
    expect(upstream.lastRequest).toMatchObject({
      url: '/base?mode=one',
      host: `127.0.0.1:${upstream.port}`,
    });
    expect(upstream.lastRequest?.headers['x-input']).toBe('second');
  });

  it('prevents browsers from storing proxied redirects', async () => {
    const upstream = await listenUpstream((_request, response) => {
      response.statusCode = 308;
      response.setHeader('location', 'https://deployed.example.test/');
      response.setHeader('cache-control', 'public, max-age=31536000');
      response.setHeader('expires', 'Fri, 31 Dec 9999 23:59:59 GMT');
      response.end();
    });
    const { application, port } = await listenApplication(
      configuration(upstream.port),
    );
    applications.push(application);

    const redirect = await request(port, 'flow.localhost');

    expect(redirect.status).toBe(308);
    expect(redirect.headers.location).toBe('https://deployed.example.test/');
    expect(redirect.headers['cache-control']).toBe('no-store');
    expect(redirect.headers.pragma).toBe('no-cache');
    expect(redirect.headers.expires).toBe('0');
  });

  it('publishes a valid API update immediately and leaves the old snapshot on invalid input', async () => {
    const first = await listenUpstream((_request, response) =>
      response.end('first'),
    );
    const second = await listenUpstream((_request, response) =>
      response.end('second'),
    );
    const store = new MemoryStore();
    const initial = configuration(first.port);
    const { application, port } = await listenApplication(initial, store);
    applications.push(application);

    const updated = configuration(second.port);
    const saved = await request(
      port,
      'router.localhost',
      '/api/config',
      'PUT',
      JSON.stringify(updated),
      {
        'content-type': 'application/json',
        origin: `http://router.localhost:${port}`,
      },
    );
    expect(saved.status).toBe(200);
    expect((await request(port, 'flow.localhost')).body).toBe('second');

    const invalid = {
      ...updated,
      routes: [{ ...updated.routes[0], hostname: 'invalid.test' }],
    };
    const rejected = await request(
      port,
      'router.localhost',
      '/api/config',
      'PUT',
      JSON.stringify(invalid),
      {
        'content-type': 'application/json',
        origin: `http://router.localhost:${port}`,
      },
    );
    expect(rejected.status).toBe(422);
    expect((await request(port, 'flow.localhost')).body).toBe('second');
    expect(store.saved).toHaveLength(1);
  });

  it('returns useful pages for unknown and disabled hosts', async () => {
    const upstream = await listenUpstream((_request, response) =>
      response.end('unused'),
    );
    const disabled = {
      ...configuration(upstream.port),
      routes: [{ ...configuration(upstream.port).routes[0]!, enabled: false }],
    };
    const { application, port } = await listenApplication(disabled);
    applications.push(application);
    const missing = await request(port, 'missing.localhost');
    const disabledResponse = await request(port, 'flow.localhost');
    expect(missing.status).toBe(404);
    expect(missing.body).toContain('Route not found');
    expect(disabledResponse.status).toBe(404);
    expect(disabledResponse.body).toContain('Route disabled');
  });

  it('returns gateway errors for unavailable and timed-out upstreams', async () => {
    const unavailableServer = await listenUpstream((_request, response) =>
      response.end(),
    );
    const unavailablePort = unavailableServer.port;
    await new Promise<void>((resolve) =>
      unavailableServer.server.close(() => resolve()),
    );
    upstreams.splice(upstreams.indexOf(unavailableServer.server), 1);

    const unavailableApplication = await listenApplication(
      configuration(unavailablePort),
    );
    applications.push(unavailableApplication.application);
    expect(
      await request(unavailableApplication.port, 'flow.localhost'),
    ).toMatchObject({ status: 502 });

    const slow = await listenUpstream(() => undefined);
    const timedApplication = await listenApplication(
      configuration(slow.port),
      new MemoryStore(),
      20,
    );
    applications.push(timedApplication.application);
    expect(
      await request(timedApplication.port, 'flow.localhost'),
    ).toMatchObject({ status: 504 });
  });

  it('tunnels WebSocket upgrades and duplex bytes', async () => {
    const upstream = http.createServer();
    upstream.on('upgrade', (_request, socket) => {
      upgradedUpstreamSockets.add(socket);
      socket.once('close', () => upgradedUpstreamSockets.delete(socket));
      socket.write(
        'HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n',
      );
      socket.on('data', (chunk: Buffer) => socket.write(chunk));
    });
    await new Promise<void>((resolve) =>
      upstream.listen(0, '127.0.0.1', resolve),
    );
    upstreams.push(upstream);
    const upstreamPort = (upstream.address() as AddressInfo).port;
    const { application, port } = await listenApplication(
      configuration(upstreamPort),
    );
    applications.push(application);

    const received = await rawUpgrade(port);
    expect(received).toContain('101 Switching Protocols');
    expect(received).toContain('ping');
  });
});

function configuration(upstreamPort: number): Configuration {
  return {
    schemaVersion: CONFIG_SCHEMA_VERSION,
    listener: { host: '127.0.0.1', port: 8088 },
    routes: [
      {
        id: 'route-1',
        displayName: 'Flow',
        hostname: 'flow.localhost',
        target: `http://127.0.0.1:${upstreamPort}`,
        enabled: true,
        transformations: [
          { operation: 'SET', name: 'x-input', value: 'second' },
        ],
      },
    ],
    groupDisplayNames: [],
  };
}

class MemoryStore implements ConfigurationStore {
  readonly saved: Configuration[] = [];
  load(): Promise<unknown> {
    return Promise.resolve(null);
  }
  save(configuration: Configuration): Promise<void> {
    this.saved.push(configuration);
    return Promise.resolve();
  }
}

async function listenApplication(
  candidate: Configuration,
  store = new MemoryStore(),
  upstreamTimeoutMilliseconds?: number,
) {
  const service = new ConfigurationService(store, candidate);
  const application = createAppServer({
    configurationService: service,
    managementUiHandler: () => Promise.resolve(false),
    ...(upstreamTimeoutMilliseconds === undefined
      ? {}
      : { upstreamTimeoutMilliseconds }),
  });
  const port = await application.listen('127.0.0.1', 0);
  return { application, port };
}

function rawUpgrade(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, '127.0.0.1');
    let received = '';
    let sentPing = false;
    socket.setTimeout(2_000, () =>
      socket.destroy(
        new Error(`Upgrade test timed out after receiving: ${received}`),
      ),
    );
    socket.on('connect', () => {
      socket.write(
        `GET /socket HTTP/1.1\r\nHost: flow.localhost\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Key: dGVzdA==\r\nSec-WebSocket-Version: 13\r\n\r\n`,
      );
    });
    socket.on('data', (chunk: Buffer) => {
      received += chunk.toString('utf8');
      if (!sentPing && received.includes('\r\n\r\n')) {
        sentPing = true;
        socket.write('ping');
      } else if (sentPing && received.endsWith('ping')) {
        socket.once('close', () => resolve(received));
        socket.destroy();
      }
    });
    socket.on('error', reject);
  });
}

async function listenUpstream(
  handler: (request: IncomingMessage, response: ServerResponse) => void,
) {
  let lastRequest: {
    url: string;
    host: string | undefined;
    headers: IncomingMessage['headers'];
  } | null = null;
  const server = http.createServer((request, response) => {
    lastRequest = {
      url: request.url ?? '',
      host: request.headers.host,
      headers: request.headers,
    };
    handler(request, response);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  upstreams.push(server);
  return {
    server,
    port: (server.address() as AddressInfo).port,
    get lastRequest() {
      return lastRequest;
    },
  };
}

function request(
  port: number,
  host: string,
  path = '/',
  method = 'GET',
  body = '',
  headers: Readonly<Record<string, string>> = {},
): Promise<{
  status: number;
  headers: IncomingMessage['headers'];
  body: string;
}> {
  return new Promise((resolve, reject) => {
    const outgoing = http.request(
      { host: '127.0.0.1', port, path, method, headers: { host, ...headers } },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () =>
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        );
      },
    );
    outgoing.on('error', reject);
    outgoing.end(body);
  });
}
