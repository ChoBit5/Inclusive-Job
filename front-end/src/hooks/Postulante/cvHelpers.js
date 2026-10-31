const MAX_CV_BYTES = 5 * 1024 * 1024;

export function validateCvFile(file) {
  if (file?.type !== 'application/pdf') {
    return 'Solo se permiten archivos PDF.';
  }

  if (file.size > MAX_CV_BYTES) {
    return 'El archivo no debe superar 5 MB.';
  }

  return null;
}

export function readCvErrorMessage(payload, fallback) {
  if (payload && typeof payload === 'object') {
    return payload.msg || payload.message || fallback;
  }

  const raw = String(payload ?? '').trim();
  if (!raw) return fallback;

  try {
    return readCvErrorMessage(JSON.parse(raw), fallback);
  } catch {
    return raw;
  }
}
