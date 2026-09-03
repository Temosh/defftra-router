import { useState } from 'react';

import { useConfiguration } from '../domains/configuration/hooks/useConfiguration';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { RoutesPage } from '../pages/routes/RoutesPage';

type Page = 'dashboard' | 'routes';

export function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const { state, reload, save } = useConfiguration();

  return (
    <div className="shell">
      <header className="topbar">
        <button
          className="brand"
          type="button"
          onClick={() => setPage('dashboard')}
        >
          <span className="brand-mark" aria-hidden="true">
            D
          </span>
          <span>Defftra Router</span>
        </button>
        <nav aria-label="Main navigation">
          <button
            className={page === 'dashboard' ? 'nav-active' : ''}
            onClick={() => setPage('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={page === 'routes' ? 'nav-active' : ''}
            onClick={() => setPage('routes')}
          >
            Routes
          </button>
        </nav>
        <span className="local-badge">
          <span aria-hidden="true" /> Loopback only
        </span>
      </header>
      <main>
        {state.status === 'loading' && (
          <div className="state-card" role="status">
            Loading configuration…
          </div>
        )}
        {state.status === 'error' && (
          <div className="state-card error" role="alert">
            <h1>Couldn’t connect</h1>
            <p>{state.message}</p>
            <button onClick={() => void reload()}>Try again</button>
          </div>
        )}
        {state.status === 'ready' && page === 'dashboard' && (
          <DashboardPage
            configuration={state.configuration}
            activePort={state.activePort}
            isSaving={state.isSaving}
            error={state.error}
            onSave={save}
            onManageRoutes={() => setPage('routes')}
          />
        )}
        {state.status === 'ready' && page === 'routes' && (
          <RoutesPage
            configuration={state.configuration}
            activePort={state.activePort}
            isSaving={state.isSaving}
            error={state.error}
            onSave={save}
          />
        )}
      </main>
    </div>
  );
}
