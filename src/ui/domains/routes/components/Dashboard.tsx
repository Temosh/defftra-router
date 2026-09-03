import type { ConfigurationDto } from '../../../../contracts/api';
import { StatusMessage } from '../../../shared/ui/StatusMessage';
import { groupRouteDtos, localUrl } from '../utils/routePresentation';

interface DashboardProps {
  readonly configuration: ConfigurationDto;
  readonly activePort: number;
  readonly isSaving: boolean;
  readonly error: string | null;
  readonly onSave: (configuration: ConfigurationDto) => Promise<boolean>;
  readonly onManageRoutes: () => void;
}

export function Dashboard({
  configuration,
  activePort,
  isSaving,
  error,
  onSave,
  onManageRoutes,
}: DashboardProps) {
  const groups = groupRouteDtos(configuration);

  const handleGroupName = (target: string, displayName: string): void => {
    const otherNames = configuration.groupDisplayNames.filter(
      (entry) => entry.target !== target,
    );
    const trimmed = displayName.trim();
    void onSave({
      ...configuration,
      groupDisplayNames: trimmed
        ? [...otherNames, { target, displayName: trimmed }]
        : otherNames,
    });
  };

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Launchpad</p>
          <h1>Your applications</h1>
          <p>
            Choose a route to open an app with its configured request headers.
          </p>
        </div>
        <button className="secondary" onClick={onManageRoutes}>
          Manage routes
        </button>
      </div>
      <StatusMessage error={error} isSaving={isSaving} />
      {groups.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">
            ↗
          </span>
          <h2>No routes yet</h2>
          <p>
            Add your first hostname and point it at a local development server.
          </p>
          <button onClick={onManageRoutes}>Add a route</button>
        </div>
      ) : (
        <div className="group-grid">
          {groups.map((group) => (
            <article className="app-card" key={group.target}>
              <label className="group-name">
                <span className="sr-only">
                  Application name for {group.target}
                </span>
                <input
                  defaultValue={group.displayName ?? ''}
                  placeholder="Name this application"
                  onBlur={(event) =>
                    handleGroupName(group.target, event.currentTarget.value)
                  }
                  disabled={isSaving}
                />
              </label>
              <p className="target" title={group.target}>
                {group.target}
              </p>
              <div className="route-launchers">
                {group.routes.map((route) => {
                  const url = localUrl(route.hostname, activePort);
                  return (
                    <a
                      className={
                        route.enabled ? 'route-launch' : 'route-launch disabled'
                      }
                      href={route.enabled ? url : undefined}
                      target="_blank"
                      rel="noreferrer"
                      key={route.id}
                      aria-disabled={!route.enabled}
                    >
                      <span>
                        <strong>{route.displayName}</strong>
                        <small>{url}</small>
                      </span>
                      <span className="launch-arrow" aria-hidden="true">
                        {route.enabled ? '↗' : 'Disabled'}
                      </span>
                    </a>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
