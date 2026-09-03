import type { Configuration } from './configuration.js';
import { ActiveConfiguration } from './routeSnapshot.js';
import { validateConfiguration } from './validation.js';

export interface ConfigurationStore {
  load(): Promise<unknown>;
  save(configuration: Configuration): Promise<void>;
}

export class ConfigurationService {
  readonly #store: ConfigurationStore;
  readonly active: ActiveConfiguration;

  constructor(store: ConfigurationStore, initialConfiguration: Configuration) {
    this.#store = store;
    this.active = new ActiveConfiguration(initialConfiguration);
  }

  async replace(candidate: unknown): Promise<Configuration> {
    const configuration = validateConfiguration(candidate);
    await this.#store.save(configuration);
    this.active.publish(configuration);
    return configuration;
  }
}
