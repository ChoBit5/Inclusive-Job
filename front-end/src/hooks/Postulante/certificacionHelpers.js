export const MAX_CERTIFICACION_TEXT_LENGTH = 200;
export const MAX_CERTIFICACION_PDF_BYTES = 5 * 1024 * 1024;

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return candidate.getUTCFullYear() === year
    && candidate.getUTCMonth() === month - 1
    && candidate.getUTCDate() === day;
}

export function validateCertificationForm({
  nombre,
  institucion,
  fecha,
  pdf = null,
  editing = false,
}) {
  const cleanName = String(nombre ?? '').trim();
  const cleanInstitution = String(institucion ?? '').trim();

  if (!cleanName || !cleanInstitution || !fecha) return 'Completa todos los campos';
  if (cleanName.length > MAX_CERTIFICACION_TEXT_LENGTH) {
    return 'El nombre no debe superar 200 caracteres.';
  }
  if (cleanInstitution.length > MAX_CERTIFICACION_TEXT_LENGTH) {
    return 'La institucion no debe superar 200 caracteres.';
  }
  if (!isValidDate(fecha)) return 'Fecha invalida';
  if (fecha > new Date().toISOString().slice(0, 10)) return 'La fecha no puede ser futura';
  if (!editing && !pdf) return 'Selecciona un PDF';
  if (pdf && pdf.type !== 'application/pdf') return 'Solo se permiten archivos PDF.';
  if (pdf && pdf.size > MAX_CERTIFICACION_PDF_BYTES) return 'El archivo no debe superar 5 MB.';

  return null;
}

export function validateCertificationListState(value) {
  if (value === null) return 'loading';
  if (!Array.isArray(value)) return 'error';
  return value.length === 0 ? 'empty' : 'data';
}
