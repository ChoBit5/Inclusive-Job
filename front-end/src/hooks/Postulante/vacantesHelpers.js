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

export function formatFecha(value) {
  if (!value) return '\u2014';
  const [date] = String(value).split(/[T ]/);
  const [year, month, day] = date.split('-');
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const monthIndex = Number(month) - 1;
  if (!year || !day || !meses[monthIndex]) return '\u2014';
  return `${Number(day)} ${meses[monthIndex]} ${year}`;
}

export function normalizeRequisitos(value) {
  const values = Array.isArray(value) ? value : String(value ?? '').split('\n');
  return values.map(item => String(item ?? '').trim()).filter(Boolean);
}

export function getSafeExternalUrl(value) {
  const clean = String(value ?? '').trim();
  return /^https?:\/\//i.test(clean) ? clean : null;
}

export function getContactHref(kind, value) {
  const clean = String(value ?? '').trim();
  if (!clean) return null;
  if (kind === 'email') return `mailto:${clean}`;
  if (kind === 'tel') return `tel:${clean}`;
  return null;
}

export function resolveVacanteFromQuery({
  search = '',
  cargando = false,
  vacantes = [],
  recomendacionesMap = new Map(),
  stateRecommendation = null,
} = {}) {
  if (cargando) return { status: 'loading' };

  const idVacante = Number(new URLSearchParams(search).get('vacante'));
  if (!idVacante) return { status: 'none' };

  const base = (Array.isArray(vacantes) ? vacantes : [])
    .find(vacante => Number(vacante?.id_vacante) === idVacante);
  if (!base) return { status: 'missing', idVacante };

  const stateId = Number(stateRecommendation?.id_vacante ?? stateRecommendation?.vacante?.id_vacante);
  const recommendationFromState = stateId === idVacante ? stateRecommendation : null;
  const recommendation = recomendacionesMap.get?.(idVacante) ?? recommendationFromState;
  const fromRecommendation = recommendation?.vacante ?? {};

  return {
    status: 'found',
    idVacante,
    vacante: {
      ...fromRecommendation,
      ...base,
      empresa: fromRecommendation.empresa ?? base.empresa,
      recomendacion_ia: recommendation ?? undefined,
    },
  };
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
