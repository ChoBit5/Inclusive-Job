export function GoogleLogin({
  onSuccess,
  onError
}) {
  return <button type="button" aria-label="Continuar con acceso demo" onClick={() => Promise.resolve(onSuccess?.({
    credential: 'demo-local'
  })).catch(() => onError?.())} style={{
    width: '100%',
    minHeight: 40,
    border: 0,
    background: 'transparent',
    cursor: 'pointer'
  }}>
      Acceso demo local
    </button>;
}
