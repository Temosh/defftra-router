import { useState, type FormEvent } from 'react';

import type {
  HeaderOperationDto,
  HeaderTransformationDto,
  RouteDto,
} from '../../../../contracts/api';
import { localUrl } from '../utils/routePresentation';

const HOSTNAME_SUFFIX = '.localhost';

interface RouteEditorProps {
  readonly route: RouteDto | null;
  readonly activePort: number;
  readonly isSaving: boolean;
  readonly saveError: string | null;
  readonly onSave: (route: RouteDto) => Promise<boolean>;
  readonly onClose: () => void;
}

interface RouteDraft {
  id: string;
  displayName: string;
  hostname: string;
  target: string;
  enabled: boolean;
  transformations: HeaderTransformationDto[];
}

export function RouteEditor({
  route,
  activePort,
  isSaving,
  saveError,
  onSave,
  onClose,
}: RouteEditorProps) {
  const [draft, setDraft] = useState<RouteDraft>(() =>
    route
      ? { ...route, transformations: [...route.transformations] }
      : {
          id: crypto.randomUUID(),
          displayName: '',
          hostname: '',
          target: 'http://127.0.0.1:3000',
          enabled: true,
          transformations: [],
        },
  );
  const [error, setError] = useState<string | null>(null);
  const hostnamePrefix = removeHostnameSuffix(draft.hostname);
  const hostnamePreview = hostnamePrefix
    ? localUrl(draft.hostname, activePort)
    : `http://your-name.localhost${activePort === 80 ? '' : `:${activePort}`}`;

  const updateTransformation = (
    index: number,
    update: Partial<HeaderTransformationDto>,
  ): void => {
    setDraft((current) => ({
      ...current,
      transformations: current.transformations.map((entry, entryIndex) =>
        entryIndex === index
          ? normalizeTransformation({ ...entry, ...update })
          : entry,
      ),
    }));
  };

  const moveTransformation = (index: number, offset: -1 | 1): void => {
    setDraft((current) => {
      const destination = index + offset;
      if (destination < 0 || destination >= current.transformations.length)
        return current;
      const transformations = [...current.transformations];
      const currentEntry = transformations[index];
      const destinationEntry = transformations[destination];
      if (!currentEntry || !destinationEntry) return current;
      transformations[index] = destinationEntry;
      transformations[destination] = currentEntry;
      return { ...current, transformations };
    });
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const validationError = validateDraft(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    if (await onSave(draft)) onClose();
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
      >
        <form onSubmit={(event) => void handleSubmit(event)}>
          <div className="editor-heading">
            <div>
              <p className="eyebrow">Route configuration</p>
              <h2 id="editor-title">{route ? 'Edit route' : 'Add route'}</h2>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={onClose}
              aria-label="Close editor"
            >
              ×
            </button>
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="route-display-name">Display name</label>
              <input
                id="route-display-name"
                autoFocus
                required
                maxLength={160}
                aria-describedby="route-display-name-hint"
                value={draft.displayName}
                onChange={(event) =>
                  setDraft({ ...draft, displayName: event.target.value })
                }
                placeholder="App with test headers"
              />
              <small id="route-display-name-hint" className="field-hint">
                Shown on the dashboard and route list.
              </small>
            </div>
            <div className="field">
              <label htmlFor="route-hostname">Local hostname</label>
              <div className="hostname-control">
                <input
                  id="route-hostname"
                  required
                  maxLength={253 - HOSTNAME_SUFFIX.length}
                  autoComplete="off"
                  spellCheck={false}
                  aria-describedby="route-hostname-hint"
                  value={hostnamePrefix}
                  onChange={(event) => {
                    const prefix = event.target.value.toLowerCase();
                    setDraft({
                      ...draft,
                      hostname: prefix ? `${prefix}${HOSTNAME_SUFFIX}` : '',
                    });
                  }}
                  placeholder="my-app"
                />
                <span className="hostname-suffix" aria-hidden="true">
                  {HOSTNAME_SUFFIX}
                </span>
              </div>
              <small id="route-hostname-hint" className="field-hint">
                Opens at {hostnamePreview}
              </small>
            </div>
            <label className="full">
              <span>HTTP upstream target</span>
              <input
                required
                type="url"
                value={draft.target}
                onChange={(event) =>
                  setDraft({ ...draft, target: event.target.value })
                }
                placeholder="http://127.0.0.1:3000"
              />
            </label>
            <label className="toggle full">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(event) =>
                  setDraft({ ...draft, enabled: event.target.checked })
                }
              />
              <span>Route enabled</span>
            </label>
          </div>
          <div className="transformations">
            <div className="section-heading">
              <div>
                <h3>Request headers</h3>
                <p>Changes run from top to bottom.</p>
              </div>
              <button
                type="button"
                className="secondary small"
                onClick={() =>
                  setDraft({
                    ...draft,
                    transformations: [
                      ...draft.transformations,
                      { operation: 'SET', name: '', value: '' },
                    ],
                  })
                }
              >
                Add header change
              </button>
            </div>
            {draft.transformations.length === 0 && (
              <p className="inline-empty">
                No transformations. Requests pass through unchanged.
              </p>
            )}
            {draft.transformations.map((transformation, index) => (
              <div
                className="transformation-row"
                key={`${index}-${transformation.operation}`}
              >
                <label>
                  <span className="sr-only">Operation</span>
                  <select
                    value={transformation.operation}
                    onChange={(event) =>
                      updateTransformation(index, {
                        operation: event.target.value as HeaderOperationDto,
                      })
                    }
                  >
                    <option>SET</option>
                    <option>APPEND</option>
                    <option>REMOVE</option>
                  </select>
                </label>
                <label>
                  <span className="sr-only">Header name</span>
                  <input
                    required
                    placeholder="x-header-name"
                    value={transformation.name}
                    onChange={(event) =>
                      updateTransformation(index, { name: event.target.value })
                    }
                  />
                </label>
                {transformation.operation !== 'REMOVE' ? (
                  <label>
                    <span className="sr-only">Header value</span>
                    <input
                      required
                      placeholder="value"
                      value={transformation.value ?? ''}
                      onChange={(event) =>
                        updateTransformation(index, {
                          value: event.target.value,
                        })
                      }
                    />
                  </label>
                ) : (
                  <span className="remove-value">All values</span>
                )}
                <div className="row-actions">
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => moveTransformation(index, -1)}
                    disabled={index === 0}
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => moveTransformation(index, 1)}
                    disabled={index === draft.transformations.length - 1}
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="icon-button danger"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        transformations: draft.transformations.filter(
                          (_, entryIndex) => entryIndex !== index,
                        ),
                      })
                    }
                    aria-label="Delete transformation"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
          {(error ?? saveError) && (
            <p className="form-error" role="alert">
              {error ?? saveError}
            </p>
          )}
          <div className="editor-actions">
            <button type="button" className="secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save route'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function normalizeTransformation(
  value: HeaderTransformationDto,
): HeaderTransformationDto {
  return value.operation === 'REMOVE'
    ? { operation: 'REMOVE', name: value.name }
    : {
        operation: value.operation,
        name: value.name,
        value: value.value ?? '',
      };
}

function validateDraft(draft: RouteDraft): string | null {
  if (!draft.hostname.toLowerCase().endsWith(HOSTNAME_SUFFIX))
    return 'Enter a local hostname.';
  if (draft.hostname.toLowerCase() === 'router.localhost')
    return 'router.localhost is reserved for management.';
  try {
    if (new URL(draft.target).protocol !== 'http:')
      return 'The upstream target must use HTTP.';
  } catch {
    return 'Enter a valid absolute upstream URL.';
  }
  return null;
}

function removeHostnameSuffix(hostname: string): string {
  return hostname.toLowerCase().endsWith(HOSTNAME_SUFFIX)
    ? hostname.slice(0, -HOSTNAME_SUFFIX.length)
    : hostname;
}
