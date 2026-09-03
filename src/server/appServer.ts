import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo, Socket } from 'node:net';

import { MANAGEMENT_HOSTNAME, routeLocalUrl } from '../core/configuration.js';
import type { ConfigurationService } from '../core/configurationService.js';
import { normalizeHostname } from '../core/validation.js';
import { createApiHandler } from './apiHandler.js';
import { closeProxyConnections, proxyHttp, proxyWebSocket } from './proxy.js';

export type ManagementUiHandler = (
  request: IncomingMessage,
  response: ServerResponse,
) => Promise<boolean>;

export interface AppServerOptions {
  readonly configurationService: ConfigurationService;
  readonly managementUiHandler: ManagementUiHandler;
  readonly onProxyFailure?: (routeId: string, error: unknown) => void;
  readonly upstreamTimeoutMilliseconds?: number;
}

export interface AppServer {
  readonly server: http.Server;
  listen(host: string, port: number): Promise<number>;
  close(): Promise<void>;
}

export function createAppServer(options: AppServerOptions): AppServer {
  let activePort = 0;
  const upgradedSockets = new Set<Socket>();
  const logFailure = options.onProxyFailure ?? (() => undefined);
  const apiHandler = createApiHandler({
    configurationService: options.configurationService,
    getActivePort: () => activePort,
  });
  const server = http.createServer((request, response) => {
    void dispatchRequest(request, response).catch(() => {
      if (!response.headersSent) {
        response.statusCode = 500;
        response.end('Defftra Router: internal error.\n');
      } else response.destroy();
    });
  });

  async function dispatchRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    const hostname = readHostname(request.headers.host);
    if (hostname === MANAGEMENT_HOSTNAME) {
      if ((request.url ?? '/').startsWith('/api/')) {
        await apiHandler(request, response);
        return;
      }
      if (await options.managementUiHandler(request, response)) return;
      response.statusCode = 404;
      response.end('Not found.\n');
      return;
    }

    const route =
      hostname === null
        ? null
        : options.configurationService.active.snapshot.find(hostname);
    if (route !== null) {
      proxyHttp(
        request,
        response,
        route,
        logFailure,
        options.upstreamTimeoutMilliseconds,
      );
      return;
    }
    const disabled =
      options.configurationService.active.configuration.routes.find(
        (candidate) => candidate.hostname === hostname && !candidate.enabled,
      );
    sendLocalPage(
      response,
      disabled ? 'Route disabled' : 'Route not found',
      activePort,
    );
  }

  server.on('upgrade', (request, socket, head) => {
    const upgradedSocket = socket as Socket;
    upgradedSockets.add(upgradedSocket);
    upgradedSocket.once('close', () => upgradedSockets.delete(upgradedSocket));
    const hostname = readHostname(request.headers.host);
    const route =
      hostname === null
        ? null
        : options.configurationService.active.snapshot.find(hostname);
    if (route === null || hostname === MANAGEMENT_HOSTNAME) {
      socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
      return;
    }
    proxyWebSocket(
      request,
      upgradedSocket,
      head,
      route,
      logFailure,
      options.upstreamTimeoutMilliseconds,
    );
  });

  return {
    server,
    listen(host, port) {
      return new Promise((resolve, reject) => {
        const onError = (error: Error) => reject(error);
        server.once('error', onError);
        server.listen(port, host, () => {
          server.off('error', onError);
          activePort = (server.address() as AddressInfo).port;
          resolve(activePort);
        });
      });
    },
    close() {
      closeProxyConnections();
      for (const socket of upgradedSockets) socket.destroy();
      return new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeIdleConnections();
      });
    },
  };
}

function readHostname(hostHeader: string | undefined): string | null {
  if (!hostHeader) return null;
  try {
    return normalizeHostname(new URL(`http://${hostHeader}`).hostname);
  } catch {
    return null;
  }
}

function sendLocalPage(
  response: ServerResponse,
  title: string,
  activePort: number,
): void {
  const managementUrl = routeLocalUrl(
    {
      id: 'management',
      displayName: 'Management',
      hostname: MANAGEMENT_HOSTNAME,
      target: 'http://127.0.0.1',
      enabled: true,
      transformations: [],
    },
    activePort,
  );
  response.statusCode = 404;
  response.setHeader('content-type', 'text/html; charset=utf-8');
  response.setHeader('x-content-type-options', 'nosniff');
  response.end(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body><main><h1>${title}</h1><p>This hostname is not currently available.</p><a href="${managementUrl}">Open Defftra Router</a></main></body></html>`,
  );
}
