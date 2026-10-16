export function QueryFeedback({ error }: { error?: string }) {
  return error ? (
    <div className="feedback feedback--error" role="alert">
      {error}
    </div>
  ) : (
    <p className="feedback" role="status">
      Загружаем локальные данные…
    </p>
  );
}
