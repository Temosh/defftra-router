import type {
  ConfigurationDto,
  ConfigurationResponse,
} from '../../../../contracts/api';

export async function fetchConfiguration(): Promise<ConfigurationResponse> {
  const response = await fetch('/api/config', {
    headers: { accept: 'application/json' },
  });
  return readResponse(response);
}

export async function putConfiguration(
  configuration: ConfigurationDto,
): Promise<ConfigurationResponse> {
  const response = await fetch('/api/config', {
    method: 'PUT',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(configuration),
  });
  return readResponse(response);
}

async function readResponse(
  response: Response,
): Promise<ConfigurationResponse> {
  const body = (await response.json()) as unknown;
  if (!response.ok) {
    const message =
      readApiError(body) ?? `Request failed with status ${response.status}.`;
    throw new Error(message);
  }
  return body as ConfigurationResponse;
}

function readApiError(body: unknown): string | null {
  if (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof body.error === 'object' &&
    body.error !== null &&
    'message' in body.error &&
    typeof body.error.message === 'string'
  ) {
    const error = body.error;
    const detailsValue: unknown = 'details' in error ? error.details : null;
    const details = isUnknownArray(detailsValue)
      ? detailsValue
          .filter(
            (detail): detail is { path: string; message: string } =>
              typeof detail === 'object' &&
              detail !== null &&
              'path' in detail &&
              typeof detail.path === 'string' &&
              'message' in detail &&
              typeof detail.message === 'string',
          )
          .map(
            (detail) => `${detail.path || 'configuration'}: ${detail.message}`,
          )
          .join(' ')
      : '';
    return [error.message, details].filter(Boolean).join(' ');
  }
  return null;
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}
