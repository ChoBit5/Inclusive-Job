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

export function normalizeRecomendacionesIA(recomendaciones = [], vacantes = []) {
  const oficiales = new Map(
    (Array.isArray(vacantes) ? vacantes : [])
      .map(vacante => [Number(vacante?.id_vacante), vacante])
      .filter(([id, vacante]) => Number.isInteger(id) && id > 0 && vacante),
  );
  const usados = new Set();

  return (Array.isArray(recomendaciones) ? recomendaciones : []).flatMap(item => {
    const id = Number(item?.id_vacante);
    const compatibilidad = Number(item?.compatibilidad);
    if (!Number.isInteger(id) || id <= 0 || usados.has(id) || !oficiales.has(id)) return [];
    if (!Number.isFinite(compatibilidad) || compatibilidad < 0 || compatibilidad > 100) return [];

    usados.add(id);
    return [{
      ...item,
      id_vacante: id,
      compatibilidad: Math.round(compatibilidad),
      vacante: oficiales.get(id),
    }];
  });
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

export function resolvePostulacionState(response = {}, { enviando = false, postulada = false } = {}) {
  if (enviando) {
    return { status: 'sending', message: 'Enviando...', disabled: true };
  }

  if (postulada || (response?.httpOk !== false && response?.ok === true)) {
    return {
      status: 'success',
      message: response?.msg || response?.message || 'Postulación enviada.',
      disabled: true,
    };
  }

  if (response?.httpOk === false || response?.ok === false) {
    return {
      status: 'error',
      message: response?.msg || response?.message || 'No se pudo enviar la postulación.',
      disabled: false,
    };
  }

  return { status: 'idle', message: '', disabled: false };
}

export function buildReportePayload(idVacante, motivo) {
  return {
    id_vacante: idVacante,
    motivo: String(motivo ?? '').trim(),
  };
}

export function validateReporteMotivo(value) {
  const motivo = String(value ?? '').trim();
  if (!motivo) return 'Por favor describe el motivo del reporte.';
  if (motivo.length > 500) return 'El motivo del reporte no debe superar 500 caracteres.';
  return '';
}

export function resolveReporteState(response = {}, { enviando = false, reportada = false } = {}) {
  if (enviando) {
    return { status: 'sending', message: 'Enviando...', disabled: true };
  }

  if (reportada || (response?.httpOk !== false && response?.ok === true)) {
    return {
      status: 'success',
      message: response?.msg || response?.message || 'Reporte enviado.',
      disabled: true,
    };
  }

  if (response?.httpOk === false || response?.ok === false) {
    return {
      status: 'error',
      message: response?.msg || response?.message || 'No se pudo enviar el reporte.',
      disabled: false,
    };
  }

  return { status: 'idle', message: '', disabled: false };
}

export function resolveMisReportesState(response = {}) {
  if (response?.httpOk === false || response?.ok === false) {
    return {
      status: 'error',
      reportes: [],
      message: response?.msg || response?.message || 'No se pudieron obtener los reportes.',
    };
  }

  if (response?.ok === true && Array.isArray(response?.data)) {
    return { status: 'success', reportes: response.data, message: '' };
  }

  return {
    status: 'error',
    reportes: [],
    message: 'La respuesta de reportes no es válida.',
  };
}

export function resolveReporteActionState(response = {}, { procesando = false } = {}) {
  if (procesando) {
    return { status: 'sending', message: 'Procesando...', disabled: true };
  }

  if (response?.httpOk === false || response?.ok === false) {
    return {
      status: 'error',
      message: response?.msg || response?.message || 'No se pudo completar la acción.',
      disabled: false,
    };
  }

  if (response?.ok === true) {
    return {
      status: 'success',
      message: response?.msg || response?.message || 'Operación completada.',
      disabled: false,
    };
  }

  return { status: 'error', message: 'La respuesta de reportes no es válida.', disabled: false };
}
