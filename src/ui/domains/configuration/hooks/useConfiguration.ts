import { useCallback, useEffect, useState } from 'react';

import type { ConfigurationDto } from '../../../../contracts/api';
import { fetchConfiguration, putConfiguration } from '../api/configurationApi';

type LoadState =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string }
  | {
      readonly status: 'ready';
      readonly configuration: ConfigurationDto;
      readonly activePort: number;
      readonly isSaving: boolean;
      readonly error: string | null;
    };

export function useConfiguration() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  const reload = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const response = await fetchConfiguration();
      setState({
        status: 'ready',
        configuration: response.configuration,
        activePort: response.activePort,
        isSaving: false,
        error: null,
      });
    } catch (error) {
      setState({ status: 'error', message: errorMessage(error) });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(
    async (configuration: ConfigurationDto): Promise<boolean> => {
      setState((current) =>
        current.status === 'ready'
          ? { ...current, isSaving: true, error: null }
          : current,
      );
      try {
        const response = await putConfiguration(configuration);
        setState({
          status: 'ready',
          configuration: response.configuration,
          activePort: response.activePort,
          isSaving: false,
          error: null,
        });
        return true;
      } catch (error) {
        setState((current) =>
          current.status === 'ready'
            ? { ...current, isSaving: false, error: errorMessage(error) }
            : current,
        );
        return false;
      }
    },
    [],
  );

  return { state, reload, save };
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'An unexpected error occurred.';
}
