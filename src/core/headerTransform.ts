import type { HeaderTransformation } from './configuration.js';

export type HeaderValue = string | readonly string[] | undefined;
export type HeaderBag = Readonly<Record<string, HeaderValue>>;

export function applyHeaderTransformations(
  incoming: HeaderBag,
  transformations: readonly HeaderTransformation[],
): Record<string, string | string[] | undefined> {
  const headers: Record<string, string | string[] | undefined> = {};
  for (const [name, value] of Object.entries(incoming)) {
    headers[name.toLowerCase()] =
      typeof value === 'string' || value === undefined ? value : [...value];
  }
  for (const transformation of transformations) {
    const name = transformation.name.toLowerCase();
    switch (transformation.operation) {
      case 'SET':
        headers[name] = transformation.value ?? '';
        break;
      case 'APPEND': {
        const current = headers[name];
        const appended = transformation.value ?? '';
        if (current === undefined) headers[name] = appended;
        else
          headers[name] = Array.isArray(current)
            ? [...current, appended]
            : [current, appended];
        break;
      }
      case 'REMOVE':
        delete headers[name];
        break;
    }
  }
  return headers;
}
