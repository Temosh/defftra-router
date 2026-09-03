import type { IncomingMessage, ServerResponse } from 'node:http';

import type { ApiError, ConfigurationResponse } from '../contracts/api.js';
import type { ConfigurationService } from '../core/configurationService.js';
import { ConfigurationValidationError } from '../core/validation.js';

const MAXIMUM_BODY_BYTES = 1024 * 1024;

export interface ApiHandlerOptions {
  readonly configurationService: ConfigurationService;
  readonly getActivePort: () => number;
}

export function createApiHandler({
  configurationService,
  getActivePort,
}: ApiHandlerOptions) {
  return async function handleApi(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    const url = new URL(request.url ?? '/', 'http://router.localhost');
    setSecurityHeaders(response);

    if (url.pathname === '/api/health' && request.method === 'GET') {
      sendJson(response, 200, { status: 'ok' });
      return;
    }
    if (url.pathname !== '/api/config') {
      sendError(
        response,
        404,
        'NOT_FOUND',
        'The requested API endpoint does not exist.',
      );
      return;
    }
    if (request.method === 'GET') {
      const body: ConfigurationResponse = {
        configuration: configurationService.active.configuration,
        activePort: getActivePort(),
      };
      sendJson(response, 200, body);
      return;
    }
    if (request.method !== 'PUT') {
      response.setHeader('allow', 'GET, PUT');
      sendError(
        response,
        405,
        'METHOD_NOT_ALLOWED',
        'This endpoint supports GET and PUT.',
      );
      return;
    }
    if (!isAllowedOrigin(request, getActivePort())) {
      sendError(
        response,
        403,
        'FORBIDDEN_ORIGIN',
        'The request origin is not allowed.',
      );
      return;
    }
    if (
      !request.headers['content-type']
        ?.toLowerCase()
        .startsWith('application/json')
    ) {
      sendError(
        response,
        415,
        'UNSUPPORTED_MEDIA_TYPE',
        'Content-Type must be application/json.',
      );
      return;
    }

    let candidate: unknown;
    try {
      candidate = await readJson(request);
    } catch (error) {
      if (error instanceof PayloadTooLargeError) {
        sendError(
          response,
          413,
          'PAYLOAD_TOO_LARGE',
          'The JSON payload is too large.',
        );
      } else {
        sendError(
          response,
          400,
          'VALIDATION_ERROR',
          'The request body must contain valid JSON.',
        );
      }
      return;
    }

    try {
      const configuration = await configurationService.replace(candidate);
      const body: ConfigurationResponse = {
        configuration,
        activePort: getActivePort(),
      };
      sendJson(response, 200, body);
    } catch (error) {
      if (error instanceof ConfigurationValidationError) {
        const body: ApiError = {
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            details: error.issues,
          },
        };
        sendJson(response, 422, body);
        return;
      }
      sendError(
        response,
        500,
        'PERSISTENCE_ERROR',
        'The configuration could not be saved.',
      );
    }
  };
}

function isAllowedOrigin(
  request: IncomingMessage,
  activePort: number,
): boolean {
  const origin = request.headers.origin;
  if (origin === undefined) return true;
  const port = activePort === 80 ? '' : `:${activePort}`;
  return origin.toLowerCase() === `http://router.localhost${port}`;
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAXIMUM_BODY_BYTES) throw new PayloadTooLargeError();
    chunks.push(new Uint8Array(buffer));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}

class PayloadTooLargeError extends Error {}

function setSecurityHeaders(response: ServerResponse): void {
  response.setHeader('cache-control', 'no-store');
  response.setHeader('x-content-type-options', 'nosniff');
  response.setHeader(
    'content-security-policy',
    "default-src 'self'; style-src 'self'; script-src 'self'",
  );
}

function sendError(
  response: ServerResponse,
  status: number,
  code: ApiError['error']['code'],
  message: string,
): void {
  sendJson(response, status, { error: { code, message } } satisfies ApiError);
}

function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown,
): void {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
}
