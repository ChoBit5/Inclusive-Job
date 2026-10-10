// Lógica pura del perfil del reclutador (sin React): LADA/teléfono,
// iniciales y mapeo del estado de la empresa a badge.
// Se usa en perfil.jsx y en tests con node --test.
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

export function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'R';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

// Misma lógica que renderEmpresaBadge en perfil.jsx.
export function estadoBadgeEmpresa(formData = {}) {
  if (!formData.empresa?.trim()) return 'sin-registrar';
  const estado = Number(formData.empresa_validada);
  if (estado === 1) return 'validada';
  if (estado === 2) return 'rechazada';
  if (estado === 3) return 'suspendida';
  return 'pendiente';
}
