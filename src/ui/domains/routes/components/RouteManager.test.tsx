// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ConfigurationDto } from '../../../../contracts/api';
import { RouteManager } from './RouteManager';

const configuration: ConfigurationDto = {
  schemaVersion: 1,
  listener: { host: '127.0.0.1', port: 8088 },
  routes: [
    {
      id: 'route-1',
      displayName: 'Example',
      hostname: 'example.localhost',
      target: 'http://127.0.0.1:3000/',
      enabled: true,
      transformations: [],
    },
  ],
  groupDisplayNames: [],
};

afterEach(cleanup);

describe('RouteManager', () => {
  it('shows toggle progress without a visible page-level saving banner', () => {
    render(
      <RouteManager
        configuration={configuration}
        activePort={8088}
        isSaving={true}
        error={null}
        onSave={vi.fn(() => Promise.resolve(true))}
      />,
    );

    const savingStatus = screen.getByRole('status');
    expect(savingStatus).toHaveClass('sr-only');
    expect(savingStatus).toHaveTextContent('Saving changes…');

    const toggle = screen.getByRole('button', { name: 'Disable' });
    expect(toggle).toBeDisabled();
  });

  it('keeps progress inside the clicked toggle while saving', async () => {
    let finishSave: ((saved: boolean) => void) | undefined;
    const onSave = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          finishSave = resolve;
        }),
    );
    const { rerender } = render(
      <RouteManager
        configuration={configuration}
        activePort={8088}
        isSaving={false}
        error={null}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Disable' }));
    rerender(
      <RouteManager
        configuration={configuration}
        activePort={8088}
        isSaving={true}
        error={null}
        onSave={onSave}
      />,
    );

    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(onSave).toHaveBeenCalledWith({
      ...configuration,
      routes: [{ ...configuration.routes[0]!, enabled: false }],
    });

    await act(() => {
      finishSave?.(true);
      return Promise.resolve();
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Disable' })).toBeDisabled(),
    );
  });
});
