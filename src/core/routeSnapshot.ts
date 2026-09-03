import type { Configuration, Route } from './configuration.js';
import { normalizeHostname } from './validation.js';

export class RouteSnapshot {
  readonly #routes: ReadonlyMap<string, Route>;

  constructor(configuration: Configuration) {
    this.#routes = new Map(
      configuration.routes
        .filter((route) => route.enabled)
        .map((route) => [route.hostname, route]),
    );
  }

  find(hostname: string): Route | null {
    return this.#routes.get(normalizeHostname(hostname)) ?? null;
  }
}

export class ActiveConfiguration {
  #configuration: Configuration;
  #snapshot: RouteSnapshot;

  constructor(configuration: Configuration) {
    this.#configuration = configuration;
    this.#snapshot = new RouteSnapshot(configuration);
  }

  get configuration(): Configuration {
    return this.#configuration;
  }

  get snapshot(): RouteSnapshot {
    return this.#snapshot;
  }

  publish(configuration: Configuration): void {
    const snapshot = new RouteSnapshot(configuration);
    this.#configuration = configuration;
    this.#snapshot = snapshot;
  }
}
