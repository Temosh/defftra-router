import { useState } from 'react';

import type { ConfigurationDto, RouteDto } from '../../../../contracts/api';
import { StatusMessage } from '../../../shared/ui/StatusMessage';
import { localUrl, transformationSummary } from '../utils/routePresentation';
import { RouteEditor } from './RouteEditor';

interface RouteManagerProps {
  readonly configuration: ConfigurationDto;
  readonly activePort: number;
  readonly isSaving: boolean;
  readonly error: string | null;
  readonly onSave: (configuration: ConfigurationDto) => Promise<boolean>;
}

export function RouteManager({
  configuration,
  activePort,
  isSaving,
  error,
  onSave,
}: RouteManagerProps) {
  const [editorRoute, setEditorRoute] = useState<RouteDto | 'new' | null>(null);
  const [pendingRouteId, setPendingRouteId] = useState<string | null>(null);

  const saveRoute = async (route: RouteDto): Promise<boolean> => {
    const exists = configuration.routes.some(
      (candidate) => candidate.id === route.id,
    );
    return onSave({
      ...configuration,
      routes: exists
        ? configuration.routes.map((candidate) =>
            candidate.id === route.id ? route : candidate,
          )
        : [...configuration.routes, route],
    });
  };

  const handleDelete = (route: RouteDto): void => {
    if (
      !window.confirm(`Delete “${route.displayName}”? This cannot be undone.`)
    )
      return;
    void onSave({
      ...configuration,
      routes: configuration.routes.filter((item) => item.id !== route.id),
    });
  };

  const handleDuplicate = (route: RouteDto): void => {
    const base = route.hostname.slice(0, -'.localhost'.length);
    let hostname = `${base}-copy.localhost`;
    let suffix = 2;
    while (
      configuration.routes.some((candidate) => candidate.hostname === hostname)
    ) {
      hostname = `${base}-copy-${suffix}.localhost`;
      suffix += 1;
    }
    setEditorRoute({
      ...route,
      id: crypto.randomUUID(),
      displayName: `${route.displayName} copy`,
      hostname,
    });
  };

  const handleToggle = async (route: RouteDto): Promise<void> => {
    setPendingRouteId(route.id);
    try {
      await onSave({
        ...configuration,
        routes: configuration.routes.map((candidate) =>
          candidate.id === route.id
            ? { ...candidate, enabled: !candidate.enabled }
            : candidate,
        ),
      });
    } finally {
      setPendingRouteId(null);
    }
  };

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Configuration</p>
          <h1>Routes</h1>
          <p>Hostnames become active immediately after a successful save.</p>
        </div>
        <button onClick={() => setEditorRoute('new')}>Add route</button>
      </div>
      <StatusMessage error={error} isSaving={isSaving} />
      {configuration.routes.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">
            ＋
          </span>
          <h2>No routes configured</h2>
          <p>Create a friendly .localhost address for any local server.</p>
          <button onClick={() => setEditorRoute('new')}>
            Add your first route
          </button>
        </div>
      ) : (
        <div className="route-table-wrap">
          <table className="route-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Route</th>
                <th>Upstream</th>
                <th>Transformations</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {configuration.routes.map((route) => {
                const url = localUrl(route.hostname, activePort);
                return (
                  <tr key={route.id}>
                    <td>
                      <span
                        className={route.enabled ? 'status enabled' : 'status'}
                      >
                        <span aria-hidden="true" />
                        {route.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      <strong>{route.displayName}</strong>
                      <a
                        href={route.enabled ? url : undefined}
                        target="_blank"
                        rel="noreferrer"
                        aria-disabled={!route.enabled}
                      >
                        {url}
                      </a>
                    </td>
                    <td>
                      <code>{route.target}</code>
                    </td>
                    <td>{transformationSummary(route)}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="secondary small"
                          onClick={() => setEditorRoute(route)}
                        >
                          Edit
                        </button>
                        <button
                          className="plain small"
                          onClick={() => handleDuplicate(route)}
                        >
                          Duplicate
                        </button>
                        <button
                          className="plain small route-toggle"
                          onClick={() => void handleToggle(route)}
                          disabled={isSaving}
                        >
                          {pendingRouteId === route.id
                            ? 'Saving…'
                            : route.enabled
                              ? 'Disable'
                              : 'Enable'}
                        </button>
                        <button
                          className="plain small danger"
                          onClick={() => handleDelete(route)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {editorRoute !== null && (
        <RouteEditor
          key={editorRoute === 'new' ? 'new' : editorRoute.id}
          route={editorRoute === 'new' ? null : editorRoute}
          activePort={activePort}
          isSaving={isSaving}
          saveError={error}
          onSave={saveRoute}
          onClose={() => setEditorRoute(null)}
        />
      )}
    </section>
  );
}
