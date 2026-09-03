import { createInterface } from 'node:readline/promises';

import {
  DEFAULT_CONFIGURATION,
  MANAGEMENT_HOSTNAME,
} from '../core/configuration.js';
import { ConfigurationService } from '../core/configurationService.js';
import { validateConfiguration } from '../core/validation.js';
import { JsonConfigurationStore } from '../persistence/jsonConfigurationStore.js';
import {
  createAppServer,
  type ManagementUiHandler,
} from '../server/appServer.js';

interface CliOptions {
  readonly port?: number;
  readonly host?: '127.0.0.1' | '::1';
  readonly config?: string;
  readonly help: boolean;
  readonly version: boolean;
}

export async function runCli(
  arguments_: readonly string[],
  managementUiHandler: ManagementUiHandler,
  onShutdown?: () => Promise<void>,
): Promise<void> {
  const options = parseArguments(arguments_);
  if (options.help) {
    process.stdout.write(helpText);
    return;
  }
  if (options.version) {
    process.stdout.write('defftra-router 0.1.0\n');
    return;
  }

  const store = new JsonConfigurationStore(options.config);
  const loaded = await store.load();
  const initial =
    loaded === null ? DEFAULT_CONFIGURATION : validateConfiguration(loaded);
  if (loaded === null) await store.save(initial);
  const service = new ConfigurationService(store, initial);
  const application = createAppServer({
    configurationService: service,
    managementUiHandler,
    onProxyFailure: (routeId) => {
      process.stderr.write(`Proxy request failed for route ${routeId}.\n`);
    },
  });

  const host = options.host ?? initial.listener.host;
  const requestedPort = options.port ?? initial.listener.port;
  let activePort: number;
  try {
    activePort = await application.listen(host, requestedPort);
  } catch (error) {
    if (
      requestedPort === 80 &&
      process.stdin.isTTY &&
      process.stdout.isTTY &&
      isAddressError(error)
    ) {
      const readline = createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      const answer = await readline.question(
        'Port 80 is unavailable. Retry on port 8088? [Y/n] ',
      );
      readline.close();
      if (answer.trim() !== '' && !answer.trim().toLowerCase().startsWith('y'))
        throw error;
      activePort = await application.listen(host, 8088);
    } else {
      throw error;
    }
  }

  const displayHost = host === '::1' ? '[::1]' : host;
  const managementPort = activePort === 80 ? '' : `:${activePort}`;
  process.stdout.write(
    `Defftra Router listening on http://${displayHost}:${activePort}\n`,
  );
  process.stdout.write(
    `Management UI: http://${MANAGEMENT_HOSTNAME}${managementPort}\n`,
  );
  process.stdout.write(`Configuration: ${store.path}\n`);

  let isClosing = false;
  const shutdown = async (): Promise<void> => {
    if (isClosing) return;
    isClosing = true;
    process.stdout.write('Stopping Defftra Router...\n');
    const forceTimer = setTimeout(
      () => application.server.closeAllConnections(),
      5_000,
    );
    forceTimer.unref();
    try {
      await application.close();
      if (onShutdown) await onShutdown();
    } finally {
      clearTimeout(forceTimer);
    }
  };
  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
}

function parseArguments(arguments_: readonly string[]): CliOptions {
  let port: number | undefined;
  let host: '127.0.0.1' | '::1' | undefined;
  let config: string | undefined;
  let help = false;
  let version = false;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === '--help' || argument === '-h') help = true;
    else if (argument === '--version' || argument === '-v') version = true;
    else if (argument === '--port') {
      const rawPort = arguments_[++index];
      const parsedPort = Number(rawPort);
      if (
        !Number.isInteger(parsedPort) ||
        parsedPort < 0 ||
        parsedPort > 65535
      ) {
        throw new Error('--port must be an integer from 0 to 65535.');
      }
      port = parsedPort;
    } else if (argument === '--host') {
      const rawHost = arguments_[++index];
      if (rawHost !== '127.0.0.1' && rawHost !== '::1') {
        throw new Error('--host must be 127.0.0.1 or ::1.');
      }
      host = rawHost;
    } else if (argument === '--config') {
      const rawConfig = arguments_[++index];
      if (!rawConfig) throw new Error('--config requires a path.');
      config = rawConfig;
    } else {
      throw new Error(`Unknown argument: ${argument ?? ''}`);
    }
  }
  return {
    ...(port === undefined ? {} : { port }),
    ...(host === undefined ? {} : { host }),
    ...(config === undefined ? {} : { config }),
    help,
    version,
  };
}

function isAddressError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error.code === 'EACCES' || error.code === 'EADDRINUSE')
  );
}

const helpText = `Usage: defftra-router [options]

Options:
  --port <number>       Override the configured listener port
  --host <address>      Bind 127.0.0.1 or ::1
  --config <path>       Use a specific configuration file
  -h, --help            Show help
  -v, --version         Show version
`;
