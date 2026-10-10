// Lógica pura de la empresa del reclutador (sin React): LADA/teléfono,
// RFC mexicano, correo y mapeo de estado a tarjeta.
// Se usa en empresa.jsx y en tests con node --test.
export const PAISES_LADA = [
  { code: '+52', name: 'Mexico' },
  { code: '+1', name: 'Estados Unidos' },
  { code: '+34', name: 'Espana' },
  { code: '+54', name: 'Argentina' },
  { code: '+56', name: 'Chile' },
  { code: '+57', name: 'Colombia' },
  { code: '+51', name: 'Peru' },
  { code: '+58', name: 'Venezuela' },
  { code: '+502', name: 'Guatemala' },
  { code: '+503', name: 'El Salvador' },
  { code: '+504', name: 'Honduras' },
  { code: '+505', name: 'Nicaragua' },
  { code: '+506', name: 'Costa Rica' },
  { code: '+507', name: 'Panama' },
  { code: '+591', name: 'Bolivia' },
  { code: '+593', name: 'Ecuador' },
  { code: '+595', name: 'Paraguay' },
  { code: '+598', name: 'Uruguay' },
  { code: '+55', name: 'Brasil' },
];

export function getDefaultLada() {
  return '+52';
}

export function splitPhoneWithLada(phone = '') {
  const clean = String(phone).trim().replace(/[^\d+]/g, '');
  if (!clean) return { lada: getDefaultLada(), number: '' };

  const ladas = [...PAISES_LADA].sort((a, b) => b.code.length - a.code.length);

  if (clean.startsWith('+')) {
    const lada = ladas.find((pais) => clean.startsWith(pais.code))?.code;
    if (lada) return { lada, number: clean.slice(lada.length).replace(/\D/g, '') };
  }

  const digits = clean.replace(/\D/g, '');
  if (digits.length > 10) {
    const lada = ladas.find((pais) => {
      const ladaDigits = pais.code.replace(/\D/g, '');
      return digits.startsWith(ladaDigits) && digits.length > ladaDigits.length;
    });

    if (lada) {
      const ladaDigits = lada.code.replace(/\D/g, '');
      return { lada: lada.code, number: digits.slice(ladaDigits.length) };
    }
  }

  return { lada: getDefaultLada(), number: digits };
}

export function joinPhone(lada, number) {
  const cleanLada = String(lada || '').replace(/\D/g, '');
  const cleanNumber = String(number || '').replace(/\D/g, '');
  return cleanNumber ? `${cleanLada}${cleanNumber}` : '';
}

export function validateCompanyEmail(value) {
  const email = String(value ?? '').trim();
  if (!email) return 'El correo de la empresa es obligatorio.';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(email)) return 'Ingresa un correo de empresa valido.';
  if (email.length > 150) return 'El correo de empresa no debe superar 150 caracteres.';
  return '';
}

export function normalizeRfc(value) {
  return String(value ?? '').toUpperCase().replace(/[\s-]/g, '');
}

export function validateMexicanRfc(value) {
  const rfc = normalizeRfc(value);
  if (!rfc) return 'El RFC de la empresa es obligatorio.';
  const rfcRegex = /^([A-ZÑ&]{3,4})(\d{2})(\d{2})(\d{2})([A-Z0-9]{3})$/;
  const match = rfc.match(rfcRegex);
  if (!match) return 'Ingresa un RFC mexicano valido. Ejemplo: ABC123456T12.';
  const [, , yy, mm, dd] = match;
  const month = Number(mm);
  const day = Number(dd);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return 'La fecha del RFC no es valida.';
  }
  const fullYear = Number(yy) <= 30 ? 2000 + Number(yy) : 1900 + Number(yy);
  const date = new Date(fullYear, month - 1, day);
  const isValidDate = date.getFullYear() === fullYear
    && date.getMonth() === month - 1
    && date.getDate() === day;
  return isValidDate ? '' : 'La fecha del RFC no es valida.';
}

// Mapea el estado de validación a la tarjeta (misma lógica que StatusCard).
export function estadoTarjetaEmpresa(companyData = {}) {
  if (!companyData.nombre_empresa?.trim()) return 'sin-registrar';
  const estado = Number(companyData.estado_validacion ?? companyData.empresa_validada);
  if (estado === 1) return 'validada';
  if (estado === 2) return 'rechazada';
  if (estado === 3) return 'suspendida';
  return 'pendiente';
}
