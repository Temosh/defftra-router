interface StatusMessageProps {
  readonly error: string | null;
  readonly isSaving: boolean;
}

export function StatusMessage({ error, isSaving }: StatusMessageProps) {
  return (
    <>
      {error && (
        <div className="banner error" role="alert">
          {error}
        </div>
      )}
      <span className="sr-only" role="status" aria-atomic="true">
        {isSaving ? 'Saving changes…' : ''}
      </span>
    </>
  );
}
