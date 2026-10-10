// Lógica pura del perfil del postulante (sin React): LADA/teléfono,
// skills, descripción de discapacidad y normalización del catálogo.
// Se usa en EdicionPerfil.jsx y en tests con node --test.
export const PAISES_LADA = [
  { code: '+52', name: 'México' },
  { code: '+1', name: 'Estados Unidos' },
  { code: '+34', name: 'España' },
  { code: '+54', name: 'Argentina' },
  { code: '+56', name: 'Chile' },
  { code: '+57', name: 'Colombia' },
  { code: '+51', name: 'Perú' },
  { code: '+58', name: 'Venezuela' },
  { code: '+502', name: 'Guatemala' },
  { code: '+503', name: 'El Salvador' },
  { code: '+504', name: 'Honduras' },
  { code: '+505', name: 'Nicaragua' },
  { code: '+506', name: 'Costa Rica' },
  { code: '+507', name: 'Panamá' },
  { code: '+591', name: 'Bolivia' },
  { code: '+593', name: 'Ecuador' },
  { code: '+595', name: 'Paraguay' },
  { code: '+598', name: 'Uruguay' },
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

export function getInitials(name) {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  return parts.length === 1
    ? parts[0][0].toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function parseSkills(raw) {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function parseDescDisc(raw) {
  if (!raw) return { nota: '', porcentaje: '' };
  const parts = raw.split(' | ');
  if (parts.length === 2) return { nota: parts[0], porcentaje: parts[1].replace('%', '') };
  if (/^\d+%$/.test(raw.trim())) return { nota: '', porcentaje: raw.replace('%', '') };
  return { nota: raw, porcentaje: '' };
}

export function normalizeDiscapacidadOption(option) {
  if (typeof option === 'string') {
    return { id: option, nombre: option, descripcion: '' };
  }

  const id = String(
    option?.id_tipo_discapacidad ??
      option?.id ??
      option?.value ??
      option?.nombre_discapacidad ??
      ''
  );

  return {
    id,
    nombre: option?.nombre_discapacidad ?? option?.nombre ?? option?.label ?? id,
    descripcion: option?.descripcion ?? '',
  };
}
