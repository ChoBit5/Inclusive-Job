const STATUS_STYLES = {
  aceptado: {
    bg: 'rgba(16,185,129,0.16)',
    color: '#34d399',
    border: 'rgba(16,185,129,0.35)',
    text: 'Aceptado',
  },
  rechazado: {
    bg: 'rgba(239,68,68,0.16)',
    color: '#f87171',
    border: 'rgba(239,68,68,0.35)',
    text: 'Rechazado',
  },
  pendiente: {
    bg: 'rgba(245,158,11,0.14)',
    color: '#fbbf24',
    border: 'rgba(245,158,11,0.32)',
    text: 'Pendiente',
  },
  revision: {
    bg: 'rgba(99,102,241,0.16)',
    color: '#a5b4fc',
    border: 'rgba(99,102,241,0.35)',
    text: 'Revision',
  },
};

export function mapEstadoPostulacion(estado) {
  const normalized = String(estado || 'pendiente').toLowerCase();
  return STATUS_STYLES[normalized] || STATUS_STYLES.pendiente;
}

export function getCvUrl(candidato = {}, endpoints) {
  if (candidato.cv_url) return candidato.cv_url;
  if (Number(candidato.tiene_cv ?? 0) && candidato.id_postulacion && endpoints?.cv) {
    return endpoints.cv(candidato.id_postulacion);
  }
  return '';
}

export function getCertificacionPdfUrl(certificacion = {}, endpoints) {
  const id = certificacion.id_certificaciones ?? certificacion.id_certificacion ?? certificacion.id;
  if (id && Number(certificacion.tiene_pdf ?? 0) && endpoints?.certificacionPdf) {
    return endpoints.certificacionPdf(id);
  }
  return '';
}

export function getEntrevistaEstado(candidato = {}, entrevistasEnviadas = new Set(), enviandoId = null) {
  if (candidato.entrevista_realizada) return 'completada';
  if (enviandoId !== null && Number(enviandoId) === Number(candidato.id_postulacion)) return 'enviando';
  if (entrevistasEnviadas.has(candidato.id_postulacion)) return 'enviada';
  return 'pendiente';
}

export function readPdfErrorMessage(payload, fallback) {
  if (payload && typeof payload === 'object') {
    return payload.message || payload.msg || fallback;
  }

  const raw = String(payload ?? '').trim();
  if (!raw) return fallback;

  try {
    return readPdfErrorMessage(JSON.parse(raw), fallback);
  } catch {
    return raw;
  }
}
