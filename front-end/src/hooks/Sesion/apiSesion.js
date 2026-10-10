// Centraliza endpoints y helpers de sesion para todo el front.
import { BACKEND_BASE_URL } from '../../config/app.js';

export const BACKEND_URL = BACKEND_BASE_URL;
export const BASE_URL = `${BACKEND_URL}/Modelo/Sesion`;

export const ENDPOINTS = {
  sesion: {
    login: `${BASE_URL}/login.php`,
    actual: `${BASE_URL}/sesion.php`,
    logout: `${BASE_URL}/sesion.php?accion=logout`,
  },
  registro: {
    postulante: `${BACKEND_URL}/Modelo/Postulante/reg_pos.php`,
    reclutador: `${BACKEND_URL}/Modelo/Reclutador/reg_reclu.php`,
  },
  password: {
    recuperar: `${BACKEND_URL}/API/recuperar_password.php`,
  },
  assets: {
    url: (src) => resolveAssetUrl(src),
  },
};

const ROLE_BY_ID = {
  1: 'administrador',
  2: 'postulante',
  3: 'reclutador',
};

const ROLE_ALIASES = {
  administrador: ['administrador', 'admin', 'panel administrativo', 'administrativo'],
  postulante: ['postulante', 'candidato', 'aspirante'],
  reclutador: ['reclutador', 'empresa', 'empleador'],
};

function normalizarTextoRol(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Devuelve el rol canonico que usa el front: administrador, postulante o reclutador.
export function rolCanonico(usuario = {}) {
  const idRol = Number(usuario.id_rol ?? usuario.idRol ?? usuario.rol_id);
  if (ROLE_BY_ID[idRol]) return ROLE_BY_ID[idRol];

  const rolNormalizado = normalizarTextoRol(usuario.rol || usuario.nombre_rol || '');

  return Object.entries(ROLE_ALIASES).find(([, aliases]) =>
    aliases.some((alias) => rolNormalizado.includes(alias))
  )?.[0] || rolNormalizado;
}

// Convierte rutas relativas del backend a URLs absolutas.
export function resolveAssetUrl(src) {
  if (!src) return '';
  if (/^(https?:|blob:|data:)/i.test(src)) return src;
  return `${BACKEND_URL}/${src.replace(/^\/+/, '')}`;
}

// Normaliza el usuario que llega de sesion.php para que las vistas siempre reciban:
// nombre, rol, rol_canonico, avatar, foto_perfil e id_rol.
export function normalizarUsuarioSesion(usuario = {}, fallback = {}) {
  const nombres = usuario.nombres || fallback.nombres || '';
  const apellidos = usuario.apellido || usuario.apellidos || fallback.apellido || fallback.apellidos || '';
  const nombreCompleto = [nombres, apellidos].filter(Boolean).join(' ').trim();
  const avatar = fallback.avatar || fallback.foto_perfil || usuario.avatar || usuario.foto_perfil || usuario.imagen || '';
  const rolOriginal = usuario.rol || usuario.nombre_rol || fallback.rol || '';
  const idRol = Number(usuario.id_rol ?? usuario.idRol ?? usuario.rol_id ?? fallback.id_rol ?? 0) || null;

  return {
    ...fallback,
    ...usuario,
    nombre: usuario.nombre || nombreCompleto || fallback.nombre || 'Usuario',
    rol: rolOriginal || (idRol ? ROLE_BY_ID[idRol] : ''),
    rol_canonico: rolCanonico({ ...fallback, ...usuario, rol: rolOriginal, id_rol: idRol }),
    avatar,
    foto_perfil: usuario.foto_perfil || avatar,
    id_rol: idRol,
  };
}

// Valida permisos por rol.
export function rolPermitido(usuario = {}, allowedRoles = []) {
  if (!allowedRoles.length) return true;
  const canonico = rolCanonico(usuario);

  return allowedRoles.some((allowedRole) => {
    const allowed = normalizarTextoRol(allowedRole);
    const aliases = ROLE_ALIASES[allowed] || [allowed];

    return canonico === allowed || aliases.some((alias) => canonico.includes(alias));
  });
}

export function limpiarSesionLocal() {
  localStorage.removeItem('admin_user');
  localStorage.removeItem('postulante_token');
  localStorage.removeItem('reclutador_token');
}

// Decide a donde mandar al usuario despues de login.
export function rutaPorRol(rol = '') {
  const canonico = typeof rol === 'object'
    ? rolCanonico(rol)
    : rolCanonico({ rol });

  if (canonico === 'administrador') return '/admin';
  if (canonico === 'postulante') return '/formulario';
  if (canonico === 'reclutador') return '/reclutador';
  return '/login';
}

// Wrapper interno para requests JSON.
// credentials: 'include' es obligatorio para enviar/recibir la cookie.
async function requestJson(url, options = {}) {
  const { body, headers, ...rest } = options;
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    ...rest,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || data.msg || data.mensaje || data.error || `Error ${res.status}: ${res.statusText}`);
  }

  return data;
}

//LOGIN
export async function loginSesion(credenciales) {
  const data = await requestJson(ENDPOINTS.sesion.login, {
    method: 'POST',
    body: credenciales,
  });

  if (!data.success) {
    throw new Error(data.message || 'Credenciales incorrectas.');
  }

  return data;
}

export function registrarUsuario(tipo, datos) {
  const endpoint = tipo === 'postulante'
    ? ENDPOINTS.registro.postulante
    : ENDPOINTS.registro.reclutador;

  return requestJson(endpoint, { method: 'POST', body: datos });
}

export function recuperarPassword(email) {
  return requestJson(ENDPOINTS.password.recuperar, {
    method: 'POST',
    body: { email },
  });
}

// Consulta sesion.php y devuelve useruario.
export async function obtenerSesion({ fallbackUser = {}, allowedRoles = [] } = {}) {
  const session = await requestJson(ENDPOINTS.sesion.actual);
  const user = session.user ? normalizarUsuarioSesion(session.user, fallbackUser) : null;
  const auth = Boolean(session.auth && user);
  const allowed = auth && rolPermitido(user, allowedRoles);

  return {
    ...session,
    auth,
    allowed,
    user,
  };
}

// lanza error si no hay sesion o el rol no coincide.
export async function requerirSesion({ fallbackUser = {}, allowedRoles = [] } = {}) {
  const session = await obtenerSesion({ fallbackUser, allowedRoles });

  if (!session.auth) {
    throw new Error('Sesion no valida.');
  }

  if (!session.allowed) {
    throw new Error('No tienes permisos para acceder a esta pagina.');
  }

  return session;
}

// Flujo completo de login:
// 1. POST login.php
// 2. GET sesion.php
// 3. Valida allowedRoles
// Si el rol no corresponde, cierra la sesion para no dejar cookies de otro panel.
export async function loginYObtenerSesion(credenciales, options = {}) {
  const login = await loginSesion(credenciales);

  try {
    const session = await requerirSesion(options);
    return { login, session };
  } catch (err) {
    await cerrarSesion();
    throw err;
  }
}

// Cierra sesion en backend y limpia datos locales del front.
export async function cerrarSesion() {
  try {
    return await requestJson(ENDPOINTS.sesion.logout, {
      method: 'POST',
    });
  } finally {
    limpiarSesionLocal();
  }
}
