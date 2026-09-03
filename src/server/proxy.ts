import http, {
  type IncomingHttpHeaders,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import net, { type Socket } from 'node:net';

import type { Route } from '../core/configuration.js';
import { applyHeaderTransformations } from '../core/headerTransform.js';

const UPSTREAM_TIMEOUT_MILLISECONDS = 30_000;
const hopByHopHeaders = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'proxy-connection',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

export function proxyHttp(
  request: IncomingMessage,
  response: ServerResponse,
  route: Route,
  onFailure: (routeId: string, error: unknown) => void,
  timeoutMilliseconds = UPSTREAM_TIMEOUT_MILLISECONDS,
): void {
  const target = new URL(route.target);
  const headers = createUpstreamHeaders(request.headers, route, target, false);
  const upstream = http.request(
    {
      protocol: 'http:',
      hostname: target.hostname,
      port: target.port || 80,
      method: request.method,
      path: composeUpstreamPath(target, request.url ?? '/'),
      headers,
      agent: sharedAgent,
    },
    (upstreamResponse) => {
      const statusCode = upstreamResponse.statusCode ?? 502;
      response.writeHead(
        statusCode,
        filterResponseHeaders(upstreamResponse.headers, statusCode),
      );
      upstreamResponse.pipe(response);
    },
  );
  upstream.setTimeout(timeoutMilliseconds, () => {
    upstream.destroy(new Error('Upstream request timed out.'));
  });
  upstream.on('error', (error) => {
    onFailure(route.id, error);
    if (!response.headersSent) {
      sendGatewayError(
        response,
        error.message.includes('timed out') ? 504 : 502,
      );
    } else {
      response.destroy();
    }
  });
  request.on('aborted', () => upstream.destroy());
  request.pipe(upstream);
}

export function proxyWebSocket(
  request: IncomingMessage,
  clientSocket: Socket,
  clientHead: Buffer,
  route: Route,
  onFailure: (routeId: string, error: unknown) => void,
  timeoutMilliseconds = UPSTREAM_TIMEOUT_MILLISECONDS,
): void {
  const target = new URL(route.target);
  const headers = createUpstreamHeaders(request.headers, route, target, true);
  let isConnected = false;
  const upstreamSocket = net.connect(
    Number(target.port || 80),
    target.hostname,
  );
  upstreamSocket.setTimeout(timeoutMilliseconds, () => {
    upstreamSocket.destroy(
      new Error('Upstream WebSocket connection timed out.'),
    );
  });
  upstreamSocket.on('connect', () => {
    isConnected = true;
    upstreamSocket.write(
      `${request.method ?? 'GET'} ${composeUpstreamPath(target, request.url ?? '/')} HTTP/${request.httpVersion}\r\n${serializeHeaders(headers)}\r\n`,
    );
    if (clientHead.length > 0) upstreamSocket.write(clientHead);
    upstreamSocket.pipe(clientSocket).pipe(upstreamSocket);
  });
  upstreamSocket.on('error', (error) => {
    onFailure(route.id, error);
    if (!isConnected && !clientSocket.destroyed) {
      clientSocket.end('HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n');
    } else clientSocket.destroy();
  });
  upstreamSocket.on('close', () => clientSocket.destroy());
  clientSocket.on('error', () => upstreamSocket.destroy());
  clientSocket.on('close', () => upstreamSocket.destroy());
}

export function closeProxyConnections(): void {
  sharedAgent.destroy();
}

function createUpstreamHeaders(
  incoming: IncomingHttpHeaders,
  route: Route,
  target: URL,
  isUpgrade: boolean,
): Record<string, string | string[] | undefined> {
  const headers = applyHeaderTransformations(incoming, route.transformations);
  if (!isUpgrade) {
    for (const name of hopByHopHeaders) delete headers[name];
  } else {
    headers.connection = 'Upgrade';
    headers.upgrade = incoming.upgrade;
  }
  headers.host = target.host;
  return headers;
}

function filterResponseHeaders(
  headers: IncomingHttpHeaders,
  statusCode: number,
): IncomingHttpHeaders {
  const filtered: IncomingHttpHeaders = { ...headers };
  for (const name of hopByHopHeaders) delete filtered[name];
  if (isRedirectStatus(statusCode) && filtered.location !== undefined) {
    filtered['cache-control'] = 'no-store';
    filtered.pragma = 'no-cache';
    filtered.expires = '0';
  }
  return filtered;
}

function isRedirectStatus(statusCode: number): boolean {
  return (
    statusCode === 300 ||
    statusCode === 301 ||
    statusCode === 302 ||
    statusCode === 303 ||
    statusCode === 305 ||
    statusCode === 307 ||
    statusCode === 308
  );
}

function composeUpstreamPath(target: URL, incomingPath: string): string {
  const incoming = new URL(incomingPath, 'http://localhost');
  const prefix =
    target.pathname === '/' ? '' : target.pathname.replace(/\/$/, '');
  const pathname = incoming.pathname.startsWith('/')
    ? incoming.pathname
    : `/${incoming.pathname}`;
  const targetQuery = target.search ? target.search.slice(1) : '';
  const incomingQuery = incoming.search ? incoming.search.slice(1) : '';
  const query = [targetQuery, incomingQuery].filter(Boolean).join('&');
  return `${prefix}${pathname}${query ? `?${query}` : ''}`;
}

function serializeHeaders(
  headers: Readonly<Record<string, string | readonly string[] | undefined>>,
): string {
  const lines: string[] = [];
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    if (typeof value === 'string') lines.push(`${name}: ${value}`);
    else for (const entry of value) lines.push(`${name}: ${entry}`);
  }
  return `${lines.join('\r\n')}\r\n`;
}

function sendGatewayError(response: ServerResponse, status: 502 | 504): void {
  response.statusCode = status;
  response.setHeader('content-type', 'text/plain; charset=utf-8');
  response.end(
    status === 504
      ? 'Defftra Router: upstream timed out.\n'
      : 'Defftra Router: upstream unavailable.\n',
  );
}

const sharedAgent = new http.Agent({ keepAlive: true, maxSockets: 64 });
