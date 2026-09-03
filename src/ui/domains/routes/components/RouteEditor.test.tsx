// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { RouteDto } from '../../../../contracts/api';
import { RouteEditor } from './RouteEditor';

const route: RouteDto = {
  id: 'route-1',
  displayName: 'Summ Fun',
  hostname: 'summ.localhost',
  target: 'http://summbo.com/',
  enabled: true,
  transformations: [],
};

describe('RouteEditor', () => {
  it('edits the hostname prefix while preserving the localhost suffix', async () => {
    const onSave = vi.fn(() => Promise.resolve(true));
    const onClose = vi.fn();
    render(
      <RouteEditor
        route={route}
        activePort={8088}
        isSaving={false}
        saveError={null}
        onSave={onSave}
        onClose={onClose}
      />,
    );

    const hostname = screen.getByRole('textbox', {
      name: 'Local hostname',
    });
    expect(hostname).toHaveValue('summ');
    expect(screen.getByText('.localhost')).toBeInTheDocument();
    expect(
      screen.getByText('Opens at http://summ.localhost:8088'),
    ).toBeInTheDocument();

    fireEvent.change(hostname, { target: { value: 'preview' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save route' }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        ...route,
        hostname: 'preview.localhost',
      }),
    );
    expect(onClose).toHaveBeenCalledOnce();
  });
});
