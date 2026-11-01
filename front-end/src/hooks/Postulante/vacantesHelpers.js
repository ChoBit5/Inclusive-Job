export function normalizeModalidad(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function modalidadMatches(value, expected) {
  return normalizeModalidad(value) === normalizeModalidad(expected);
}

export function formatSalario(min, max) {
  const fmt = value => `$${Number(value).toLocaleString('es-MX')}`;
  if (!min && !max) return 'Salario a convenir';
  if (!max) return `Desde ${fmt(min)} MXN`;
  if (!min) return `Hasta ${fmt(max)} MXN`;
  return `${fmt(min)} – ${fmt(max)} MXN`;
}

export function filtrarYOrdenarVacantes(
  vacantes = [],
  { search = '', modalidad = 'Todas', orden = 'recientes' } = {},
) {
  let data = Array.isArray(vacantes) ? [...vacantes] : [];

  if (modalidad !== 'Todas') {
    data = data.filter(vacante => modalidadMatches(vacante?.modalidad, modalidad));
  }

  const query = String(search).trim().toLowerCase();
  if (query) {
    const modalidadQuery = normalizeModalidad(query);
    data = data.filter(vacante => (
      String(vacante?.titulo_puesto || '').toLowerCase().includes(query)
      || String(vacante?.empresa || '').toLowerCase().includes(query)
      || normalizeModalidad(vacante?.modalidad).includes(modalidadQuery)
    ));
  }

  if (orden === 'recientes') {
    data.sort((a, b) => new Date(b?.fecha_publicacion) - new Date(a?.fecha_publicacion));
  } else if (orden === 'salario') {
    data.sort((a, b) => (b?.salario_max ?? 0) - (a?.salario_max ?? 0));
  }

  return data;
}

export function getVacantesEmptyMessage({ sin_discapacidades = false } = {}) {
  return sin_discapacidades
    ? 'Registra tus discapacidades en tu perfil para ver vacantes compatibles.'
    : 'No hay vacantes activas compatibles con tu discapacidad registrada.';
}

export function getVacantesErrorMessage(response = {}) {
  return response?.message || 'No se pudieron cargar las vacantes. Verifica tu conexion.';
}
