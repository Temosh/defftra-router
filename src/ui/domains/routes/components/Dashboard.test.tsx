// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ConfigurationDto } from '../../../../contracts/api';
import { Dashboard } from './Dashboard';

const configuration: ConfigurationDto = {
  schemaVersion: 1,
  listener: { host: '127.0.0.1', port: 80 },
  routes: [
    {
      id: 'one',
      displayName: 'Standard',
      hostname: 'app.localhost',
      target: 'http://127.0.0.1:3000/',
      enabled: true,
      transformations: [],
    },
    {
      id: 'two',
      displayName: 'Disabled flow',
      hostname: 'off.localhost',
      target: 'http://127.0.0.1:3000/',
      enabled: false,
      transformations: [],
    },
  ],
  groupDisplayNames: [
    { target: 'http://127.0.0.1:3000/', displayName: 'Example app' },
  ],
};

describe('Dashboard', () => {
  it('groups launch choices and shows the active listener port', () => {
    render(
      <Dashboard
        configuration={configuration}
        activePort={8088}
        isSaving={false}
        error={null}
        onSave={vi.fn()}
        onManageRoutes={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Your applications' }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('Example app')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Standard/ })).toHaveAttribute(
      'href',
      'http://app.localhost:8088',
    );
    expect(screen.getByText('Disabled flow').closest('a')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });
});
