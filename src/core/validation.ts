import {
  CONFIG_SCHEMA_VERSION,
  MANAGEMENT_HOSTNAME,
  type Configuration,
  type GroupDisplayName,
  type HeaderOperation,
  type HeaderTransformation,
  type ListenerSettings,
  type Route,
} from './configuration.js';

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}

export class ConfigurationValidationError extends Error {
  readonly issues: readonly ValidationIssue[];

  constructor(issues: readonly ValidationIssue[]) {
    super('Configuration is invalid.');
    this.name = 'ConfigurationValidationError';
    this.issues = issues;
  }
}

const headerNamePattern = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const hostnamePattern =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*localhost$/;

export function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, '');
}

export function normalizeTarget(target: string): string | null {
  try {
    const parsed = new URL(target);
    if (
      parsed.protocol !== 'http:' ||
      parsed.username ||
      parsed.password ||
      parsed.hash
    )
      return null;
    parsed.hostname = parsed.hostname.toLowerCase();
    return parsed.toString();
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function readString(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  maximumLength: number,
  allowEmpty = false,
): string | null {
  if (typeof value !== 'string' || (!allowEmpty && value.trim().length === 0)) {
    issues.push({ path, message: 'Must be a string with a value.' });
    return null;
  }
  if (value.length > maximumLength) {
    issues.push({
      path,
      message: `Must be at most ${maximumLength} characters.`,
    });
    return null;
  }
  return value;
}

function parseTransformation(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): HeaderTransformation | null {
  if (!isRecord(value) || !hasOnlyKeys(value, ['operation', 'name', 'value'])) {
    issues.push({
      path,
      message: 'Must be a transformation with no unknown fields.',
    });
    return null;
  }
  const operation = value.operation;
  if (operation !== 'SET' && operation !== 'APPEND' && operation !== 'REMOVE') {
    issues.push({
      path: `${path}.operation`,
      message: 'Must be SET, APPEND, or REMOVE.',
    });
    return null;
  }
  const name = readString(value.name, `${path}.name`, issues, 256);
  if (name !== null && !headerNamePattern.test(name)) {
    issues.push({
      path: `${path}.name`,
      message: 'Must be a valid HTTP header name.',
    });
  }
  const typedOperation: HeaderOperation = operation;
  if (typedOperation === 'REMOVE') {
    if ('value' in value && value.value !== undefined) {
      issues.push({
        path: `${path}.value`,
        message: 'REMOVE must not have a value.',
      });
    }
    return name === null
      ? null
      : { operation: typedOperation, name: name.toLowerCase() };
  }
  const transformationValue = readString(
    value.value,
    `${path}.value`,
    issues,
    8192,
    true,
  );
  if (transformationValue !== null && /[\r\n]/.test(transformationValue)) {
    issues.push({
      path: `${path}.value`,
      message: 'Must not contain line breaks.',
    });
  }
  return name === null || transformationValue === null
    ? null
    : {
        operation: typedOperation,
        name: name.toLowerCase(),
        value: transformationValue,
      };
}

function parseRoute(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): Route | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      'id',
      'displayName',
      'hostname',
      'target',
      'enabled',
      'transformations',
    ])
  ) {
    issues.push({ path, message: 'Must be a route with no unknown fields.' });
    return null;
  }
  const id = readString(value.id, `${path}.id`, issues, 128);
  const displayName = readString(
    value.displayName,
    `${path}.displayName`,
    issues,
    160,
  );
  const rawHostname = readString(
    value.hostname,
    `${path}.hostname`,
    issues,
    253,
  );
  const hostname = rawHostname === null ? null : normalizeHostname(rawHostname);
  if (
    hostname !== null &&
    (!hostnamePattern.test(hostname) || hostname === MANAGEMENT_HOSTNAME)
  ) {
    issues.push({
      path: `${path}.hostname`,
      message: `Must be a valid .localhost hostname other than ${MANAGEMENT_HOSTNAME}.`,
    });
  }
  const rawTarget = readString(value.target, `${path}.target`, issues, 2048);
  const target = rawTarget === null ? null : normalizeTarget(rawTarget);
  if (rawTarget !== null && target === null) {
    issues.push({
      path: `${path}.target`,
      message:
        'Must be an absolute HTTP URL without credentials or a fragment.',
    });
  }
  if (typeof value.enabled !== 'boolean') {
    issues.push({ path: `${path}.enabled`, message: 'Must be a boolean.' });
  }
  if (
    !Array.isArray(value.transformations) ||
    value.transformations.length > 100
  ) {
    issues.push({
      path: `${path}.transformations`,
      message: 'Must be an array of at most 100 items.',
    });
    return null;
  }
  const transformations = value.transformations
    .map((entry, index) =>
      parseTransformation(entry, `${path}.transformations.${index}`, issues),
    )
    .filter((entry): entry is HeaderTransformation => entry !== null);
  if (
    id === null ||
    displayName === null ||
    hostname === null ||
    target === null ||
    typeof value.enabled !== 'boolean'
  ) {
    return null;
  }
  return {
    id,
    displayName,
    hostname,
    target,
    enabled: value.enabled,
    transformations,
  };
}

function parseListener(
  value: unknown,
  issues: ValidationIssue[],
): ListenerSettings | null {
  if (!isRecord(value) || !hasOnlyKeys(value, ['host', 'port'])) {
    issues.push({
      path: 'listener',
      message: 'Must contain only host and port.',
    });
    return null;
  }
  if (value.host !== '127.0.0.1' && value.host !== '::1') {
    issues.push({
      path: 'listener.host',
      message: 'Must be a loopback address (127.0.0.1 or ::1).',
    });
  }
  if (
    !Number.isInteger(value.port) ||
    (value.port as number) < 1 ||
    (value.port as number) > 65535
  ) {
    issues.push({
      path: 'listener.port',
      message: 'Must be an integer from 1 to 65535.',
    });
  }
  return (value.host === '127.0.0.1' || value.host === '::1') &&
    Number.isInteger(value.port) &&
    (value.port as number) >= 1 &&
    (value.port as number) <= 65535
    ? { host: value.host, port: value.port as number }
    : null;
}

function parseGroupName(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): GroupDisplayName | null {
  if (!isRecord(value) || !hasOnlyKeys(value, ['target', 'displayName'])) {
    issues.push({ path, message: 'Must contain only target and displayName.' });
    return null;
  }
  const rawTarget = readString(value.target, `${path}.target`, issues, 2048);
  const target = rawTarget === null ? null : normalizeTarget(rawTarget);
  if (rawTarget !== null && target === null) {
    issues.push({
      path: `${path}.target`,
      message: 'Must be an absolute HTTP URL.',
    });
  }
  const displayName = readString(
    value.displayName,
    `${path}.displayName`,
    issues,
    160,
  );
  return target === null || displayName === null
    ? null
    : { target, displayName };
}

export function validateConfiguration(value: unknown): Configuration {
  const issues: ValidationIssue[] = [];
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      'schemaVersion',
      'listener',
      'routes',
      'groupDisplayNames',
    ])
  ) {
    throw new ConfigurationValidationError([
      {
        path: '',
        message: 'Must be a configuration object with no unknown fields.',
      },
    ]);
  }
  if (value.schemaVersion !== CONFIG_SCHEMA_VERSION) {
    issues.push({
      path: 'schemaVersion',
      message: `Must equal ${CONFIG_SCHEMA_VERSION}.`,
    });
  }
  const listener = parseListener(value.listener, issues);
  const routes = Array.isArray(value.routes)
    ? value.routes.map((entry, index) =>
        parseRoute(entry, `routes.${index}`, issues),
      )
    : (issues.push({ path: 'routes', message: 'Must be an array.' }), []);
  const groupDisplayNames = Array.isArray(value.groupDisplayNames)
    ? value.groupDisplayNames.map((entry, index) =>
        parseGroupName(entry, `groupDisplayNames.${index}`, issues),
      )
    : (issues.push({ path: 'groupDisplayNames', message: 'Must be an array.' }),
      []);

  const typedRoutes = routes.filter((route): route is Route => route !== null);
  const typedGroupNames = groupDisplayNames.filter(
    (entry): entry is GroupDisplayName => entry !== null,
  );
  const ids = new Set<string>();
  const hostnames = new Set<string>();
  for (const [index, route] of typedRoutes.entries()) {
    if (ids.has(route.id))
      issues.push({ path: `routes.${index}.id`, message: 'Must be unique.' });
    if (hostnames.has(route.hostname)) {
      issues.push({
        path: `routes.${index}.hostname`,
        message: 'Must be unique.',
      });
    }
    ids.add(route.id);
    hostnames.add(route.hostname);
  }
  const groupTargets = new Set<string>();
  for (const [index, group] of typedGroupNames.entries()) {
    if (groupTargets.has(group.target)) {
      issues.push({
        path: `groupDisplayNames.${index}.target`,
        message: 'Must be unique.',
      });
    }
    groupTargets.add(group.target);
  }
  if (issues.length > 0 || listener === null)
    throw new ConfigurationValidationError(issues);
  return Object.freeze({
    schemaVersion: CONFIG_SCHEMA_VERSION,
    listener: Object.freeze(listener),
    routes: Object.freeze(typedRoutes.map((route) => Object.freeze(route))),
    groupDisplayNames: Object.freeze(
      typedGroupNames.map((entry) => Object.freeze(entry)),
    ),
  });
}
