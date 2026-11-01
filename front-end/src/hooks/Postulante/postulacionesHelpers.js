const ESTADOS_ACEPTADOS = new Set(['aceptado', 'aceptada', 'contratado', 'contratada']);
const ESTADOS_RECHAZADOS = new Set(['rechazado', 'rechazada']);

function normalizarTexto(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function getEstadoPostulacion(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  const style = ESTADOS_ACEPTADOS.has(raw)
    ? 'aceptado'
    : ESTADOS_RECHAZADOS.has(raw)
      ? 'rechazado'
      : 'revisando';
  const label = raw ? `${raw.charAt(0).toUpperCase()}${raw.slice(1)}` : 'Revisando';
  return { style, label };
}

export function filtrarPostulaciones(postulaciones = [], query = '') {
  const normalizedQuery = normalizarTexto(query);
  if (!normalizedQuery) return Array.isArray(postulaciones) ? postulaciones : [];

  return (Array.isArray(postulaciones) ? postulaciones : []).filter(postulacion => {
    const searchable = [
      postulacion?.vacante,
      postulacion?.modalidad,
      postulacion?.estado,
      postulacion?.fecha,
    ].map(normalizarTexto).join(' ');
    return searchable.includes(normalizedQuery);
  });
}

export function formatFecha(value) {
  if (!value) return '—';
  const [date] = String(value).split(/[T ]/);
  const [year, month, day] = date.split('-');
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const monthIndex = Number(month) - 1;
  if (!year || !day || !meses[monthIndex]) return '—';
  return `${Number(day)} ${meses[monthIndex]} ${year}`;
}

export function formatSalario(min, max) {
  const fmt = value => `$${Number(value).toLocaleString('es-MX')}`;
  if (min == null && max == null) return 'Salario a convenir';
  if (max == null) return `Desde ${fmt(min)} MXN`;
  if (min == null) return `Hasta ${fmt(max)} MXN`;
  return `${fmt(min)} – ${fmt(max)} MXN`;
}

export function getPostulacionesErrorMessage(response = {}) {
  return response?.msg || response?.message || 'No se pudieron cargar tus postulaciones.';
}
