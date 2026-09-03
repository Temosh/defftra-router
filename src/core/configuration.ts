export const CONFIG_SCHEMA_VERSION = 1 as const;
export const MANAGEMENT_HOSTNAME = 'router.localhost';

export type HeaderOperation = 'SET' | 'APPEND' | 'REMOVE';

export interface HeaderTransformation {
  readonly operation: HeaderOperation;
  readonly name: string;
  readonly value?: string;
}

export interface Route {
  readonly id: string;
  readonly displayName: string;
  readonly hostname: string;
  readonly target: string;
  readonly enabled: boolean;
  readonly transformations: readonly HeaderTransformation[];
}

export interface ListenerSettings {
  readonly host: string;
  readonly port: number;
}

export interface GroupDisplayName {
  readonly target: string;
  readonly displayName: string;
}

export interface Configuration {
  readonly schemaVersion: typeof CONFIG_SCHEMA_VERSION;
  readonly listener: ListenerSettings;
  readonly routes: readonly Route[];
  readonly groupDisplayNames: readonly GroupDisplayName[];
}

export const DEFAULT_CONFIGURATION: Configuration = Object.freeze({
  schemaVersion: CONFIG_SCHEMA_VERSION,
  listener: Object.freeze({ host: '127.0.0.1', port: 80 }),
  routes: Object.freeze([]),
  groupDisplayNames: Object.freeze([]),
});

export interface ApplicationGroup {
  readonly target: string;
  readonly displayName: string | null;
  readonly routes: readonly Route[];
}

export function groupRoutes(
  configuration: Configuration,
): readonly ApplicationGroup[] {
  const names = new Map(
    configuration.groupDisplayNames.map((entry) => [
      entry.target,
      entry.displayName,
    ]),
  );
  const groups = new Map<string, Route[]>();
  for (const route of configuration.routes) {
    const existing = groups.get(route.target) ?? [];
    existing.push(route);
    groups.set(route.target, existing);
  }
  return [...groups].map(([target, routes]) => ({
    target,
    displayName: names.get(target) ?? null,
    routes,
  }));
}

export function routeLocalUrl(route: Route, port: number): string {
  return `http://${route.hostname}${port === 80 ? '' : `:${port}`}`;
}
