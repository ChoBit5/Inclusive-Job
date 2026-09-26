import { fixtures } from './fixtures.js';
import { interfaceAction, readInterfaceResource } from './resources.js';

const idle = { loading: false, error: null };
const copy = (value) => structuredClone(value);
const rows = (collection) => copy(fixtures[collection] ?? []);
const first = (collection, id) => rows(collection).find((row) => String(row.id ?? row.id_vacante ?? row.id_empresas ?? row.id_usuario ?? row.id_postulacion ?? row.id_reporte) === String(id)) ?? null;
const staticViews = new Map();
const view = (key, create) => {
  if (!staticViews.has(key)) staticViews.set(key, create());
  return staticViews.get(key);
};
const query = (resource) => view(`query:${resource ?? 'empty'}`, () => {
  const data = resource ? readInterfaceResource(resource) : null;
  return { data, ...idle, refetch: async () => data };
});
const action = async (_resource, _method, payload = {}) => interfaceAction(payload);
const result = (data = {}) => Promise.resolve({ success: true, ok: true, auth: true, httpOk: true, data: copy(data), ...(Array.isArray(data) ? {} : copy(data)) });

export const BACKEND_URL = '';
export const BASE_URL = '';
export const ENDPOINTS = {
  dashboard: { stats: 'admin:dashboard', resumen: 'postulante:dashboard' },
  empresas: { list: 'admin:empresas', detail: (id) => `admin:empresa:${id}`, aprobar: (id) => `admin:empresa:aprobar:${id}`, rechazar: (id) => `admin:empresa:rechazar:${id}`, suspender: (id) => `admin:empresa:suspender:${id}`, reactivar: (id) => `admin:empresa:reactivar:${id}` },
  usuarios: { list: 'admin:usuarios', detail: (id) => `admin:usuario:${id}`, cv: () => '', certificacionPdf: () => '', suspender: (id) => `admin:usuario:suspender:${id}`, reactivar: (id) => `admin:usuario:reactivar:${id}` },
  vacantes: { list: 'admin:vacantes', detail: (id) => `admin:vacante:${id}`, cerrar: (id) => `admin:vacante:cerrar:${id}`, eliminar: (id) => `admin:vacante:eliminar:${id}`, listar: 'reclutador:vacantes', crear: 'reclutador:vacante:crear', editar: 'reclutador:vacante:editar', actualizarEstado: 'reclutador:vacante:estado' },
  postulaciones: { list: 'admin:postulaciones', detail: (id) => `admin:postulacion:${id}`, actualizarEstado: (id) => `admin:postulacion:estado:${id}`, recurso: 'postulante:postulaciones' },
  discapacidades: { list: 'admin:discapacidades', create: 'admin:discapacidad:crear', update: (id) => `admin:discapacidad:editar:${id}`, delete: (id) => `admin:discapacidad:eliminar:${id}` },
  reportes: { list: 'admin:reportes', ignorar: (id) => `admin:reporte:ignorar:${id}`, eliminarVacante: (id) => `admin:reporte:eliminar:${id}`, listar: 'reclutador:reportes', marcarAvisoAtendido: (id) => `reclutador:reporte:atender:${id}`, recurso: 'postulante:reportes' },
  perfil: { obtener: 'reclutador:perfil', actualizar: 'reclutador:perfil:actualizar' },
  empresa: { obtener: 'reclutador:empresa', actualizar: 'reclutador:empresa:actualizar' },
  catalogos: { discapacidades: 'reclutador:discapacidades' },
  candidatos: { porVacante: 'reclutador:candidatos', actualizarEstadoPostulacion: 'reclutador:candidato:estado' },
  documentos: { cv: '', certificaciones: 'postulante:certificaciones' },
  chat: { responder: 'postulante:chat', historial: 'postulante:historial' },
  verificacion: { reenviar: 'postulante:verificacion:reenviar', verificar: 'postulante:verificacion:verificar' },
  formulario: { estado: 'postulante:formulario:estado', guardar: 'postulante:formulario:guardar' },
  ia: { recomendarVacantes: 'postulante:recomendar', analizarCv: 'postulante:analizar-cv', entrevistaPostulaciones: 'postulante:entrevista:postulaciones', entrevistaIniciar: 'postulante:entrevista:iniciar', entrevistaResponder: 'postulante:entrevista:responder', entrevistaFinalizar: 'postulante:entrevista:finalizar', entrevistaReal: 'postulante:entrevista:real' },
};

export function useFetch(resource) {
  return query(resource);
}

export function useApiAction() {
  return { execute: action, ...idle };
}

export function usePagination(initialPage = 1, initialLimit = 10) {
  return { page: initialPage, limit: initialLimit, goToPage: () => {}, reset: () => {} };
}

export function useSearch() {
  return { query: '', setQuery: () => {}, debouncedQuery: '' };
}

export function useDashboardStats() {
  const { data, ...meta } = query(ENDPOINTS.dashboard.stats);
  const stats = data?.data ?? {};
  return { stats, actividadMensual: stats.actividad_mensual ?? [], ultimasVacantes: stats.ultimas_vacantes ?? [], empresasPendientes: stats.empresas_pendientes_lista ?? [], ...meta };
}

export const useEmpresas = () => query(ENDPOINTS.empresas.list);
export const useEmpresaDetalle = (id) => query(id ? ENDPOINTS.empresas.detail(id) : null);
export const useUsuarios = () => query(ENDPOINTS.usuarios.list);
export const useUsuarioDetalle = (id) => query(id ? ENDPOINTS.usuarios.detail(id) : null);
export const useVacantes = () => query(ENDPOINTS.vacantes.list);
export const useVacanteDetalle = (id) => query(id ? ENDPOINTS.vacantes.detail(id) : null);
export const usePostulaciones = () => query(ENDPOINTS.postulaciones.list);
export const usePostulacionDetalle = (id) => query(id ? ENDPOINTS.postulaciones.detail(id) : null);
export const useDiscapacidades = () => query(ENDPOINTS.discapacidades.list);
export const useReportes = () => query(ENDPOINTS.reportes.list);

export const useEmpresaAcciones = () => ({ aprobar: (id) => action(ENDPOINTS.empresas.aprobar(id)), rechazar: (id, motivo) => action(ENDPOINTS.empresas.rechazar(id), 'POST', { motivo }), suspender: (id) => action(ENDPOINTS.empresas.suspender(id)), reactivar: (id) => action(ENDPOINTS.empresas.reactivar(id)), ...idle });
export const useUsuarioAcciones = () => ({ suspender: (id) => action(ENDPOINTS.usuarios.suspender(id)), reactivar: (id) => action(ENDPOINTS.usuarios.reactivar(id)), ...idle });
export const useVacanteAcciones = () => ({ cerrar: (id) => action(ENDPOINTS.vacantes.cerrar(id)), eliminar: (id) => action(ENDPOINTS.vacantes.eliminar(id)), ...idle });
export const usePostulacionAcciones = () => ({ actualizarEstado: (id, estado) => action(ENDPOINTS.postulaciones.actualizarEstado(id), 'POST', { estado }), ...idle });
export const useDiscapacidadAcciones = () => ({ crear: (data) => action(ENDPOINTS.discapacidades.create, 'POST', data), editar: (id, data) => action(ENDPOINTS.discapacidades.update(id), 'POST', data), eliminar: (id) => action(ENDPOINTS.discapacidades.delete(id)), ...idle });
export const useReporteAcciones = () => ({ ignorar: (id) => action(ENDPOINTS.reportes.ignorar(id)), eliminarVacante: (id, data) => action(ENDPOINTS.reportes.eliminarVacante(id), 'POST', data), ...idle });

export const useReclutadorDashboard = () => query('reclutador:dashboard');
export const usePerfilReclutador = () => query('reclutador:perfil');
export const useEmpresaReclutador = () => query('reclutador:empresa');
export const useDiscapacidadesReclutador = () => query('reclutador:discapacidades');
export const useVacantesReclutador = () => query('reclutador:vacantes');
export const useDetalleVacanteReclutador = (id) => query(id ? `reclutador:vacante:${id}` : null);
export const useVacantesConCandidatosReclutador = () => query('reclutador:candidatos');
export const useReportesReclutador = () => query('reclutador:reportes');
export const useActualizarPerfilReclutador = () => ({ actualizarPerfil: (data) => action(ENDPOINTS.perfil.actualizar, 'POST', data), ...idle });
export const useActualizarEmpresaReclutador = () => ({ actualizarEmpresa: (data) => action(ENDPOINTS.empresa.actualizar, 'POST', data), ...idle });
export const useGuardarVacanteReclutador = () => ({ guardarVacante: (data) => action(ENDPOINTS.vacantes.crear, 'POST', data), editarVacante: (data) => action(ENDPOINTS.vacantes.editar, 'POST', data), actualizarEstadoVacante: (data) => action(ENDPOINTS.vacantes.actualizarEstado, 'POST', data), eliminarVacante: (id) => action(ENDPOINTS.vacantes.eliminar(id)), ...idle });
export const useCandidatosVacanteReclutador = () => ({ obtenerCandidatosVacante: async (id) => result({ vacante: first('vacantes', id) ?? fixtures.vacantes[0], candidatos: rows('candidatos'), postulaciones: rows('postulaciones').filter((row) => String(row.id_vacante) === String(id)) }), actualizarEstadoPostulacion: (data) => action(ENDPOINTS.candidatos.actualizarEstadoPostulacion, 'POST', data), ...idle });
export const useAvisosReportesReclutador = () => ({ marcarAvisoAtendido: (id) => action(ENDPOINTS.reportes.marcarAvisoAtendido(id)), ...idle });
export const useReclutadorResource = (resource) => query(resource);
export const useReclutadorAction = () => useApiAction();
export const useReclutadorChat = () => ({ enviarMensaje: async () => 'Asistente disponible como interfaz visual.', ...idle });
export const useReclutadorChatHistorial = () => view('reclutador:chat:historial', () => ({ cargarHistorial: async () => [{ rol: 'assistant', contenido: 'Hola, puedo ayudarte a revisar tus vacantes.' }], ...idle }));
export const useMejorCandidatoReclutador = () => ({ buscarMejorCandidato: async () => ({ ok: true, recomendacion: { ...fixtures.candidatos[0], id_postulacion: 1, vacante: fixtures.vacantes[0], coincidencia: 92 }, mensaje: 'Vista previa de recomendación.' }), ...idle });
export const useMejorarRedaccionReclutador = () => ({ mejorarTexto: async ({ campo, texto } = {}) => ({ ok: true, campo, texto_mejorado: texto ?? '', sugerencias: [], nota: 'Vista previa de interfaz.' }), ...idle });
export const useSolicitarEntrevistaReclutador = () => ({ solicitarEntrevista: async () => ({ ok: true, mensaje: 'Acción no persistente.' }), ...idle });

export const useFormularioPostulante = () => ({ obtenerEstadoFormulario: () => result({ completado: true, requiere_formulario: false }), guardarFormulario: () => result({ message: 'Acción no persistente.' }) });
export const useVerificacionPostulante = () => ({ reenviarCodigo: () => result({ message: 'Código de muestra.' }), verificarCodigo: () => result({ verificado: true, message: 'Vista previa.' }) });
export const usePerfilPostulante = () => ({ obtenerPerfil: () => result({ nombres: 'Andrea', apellidos: 'Martínez', correo: 'andrea@email.mx', telefono: '5550011001', ciudad: 'Ciudad de México', discapacidad: ['Motriz'], discapacidad_ids: ['1'], descripcion_discapacidad: 'Perfil de muestra', catalogo_discapacidades: rows('discapacidades'), habilidades: ['Figma', 'Investigación UX', 'Accesibilidad'], experiencia: 'Diseñadora UX con experiencia en productos digitales.', portafolio_url: '', esfuerzo_fisico_posible: false }), actualizarPerfil: () => result({ message: 'Acción no persistente.' }), backendUrl: '' });
export const useDocumentosPostulante = () => view('postulante:documentos', () => ({ obtenerCvBlob: async () => new Blob(['Vista previa de CV.'], { type: 'application/pdf' }), verificarCv: async () => true, subirCv: () => result({}), listarCertificaciones: () => result({ certificaciones: [{ id_certificacion: 1, nombre: 'Fundamentos de accesibilidad web', institucion: 'Inclusive Academy', fecha_emision: '2026-05-10' }] }), guardarCertificacion: () => result({}), eliminarCertificacion: () => result({}), cvUrl: '', certificacionesUrl: '' }));
export const useVacantesPostulante = () => view('postulante:vacantes', () => ({ listarVacantes: () => result({ vacantes: rows('vacantes') }), postularse: () => result({}), reportarVacante: () => result({}) }));
export const usePostulacionesPostulante = () => ({ listarPostulaciones: () => result(rows('postulaciones').filter((row) => row.id_usuario === 3).map((row) => ({ ...row, id: row.id_postulacion }))), despostular: () => result({}) });
export const useReportesPostulante = () => ({ listarReportes: () => result(rows('reportes').filter((row) => row.reportante === 'Andrea Martínez').map((row) => ({ ...row, id: row.id_reporte }))), eliminarReporte: () => result({}), editarReporte: () => result({}) });
export const useEntrevistaRealPostulante = () => ({ ejecutarEntrevista: () => result({ evaluacion: { puntuacion: 88, resumen: 'Vista previa de entrevista.' } }) });
export const usePostulanteDashboard = () => query('postulante:dashboard');
export const usePostulanteChat = () => ({ enviarMensaje: async () => 'Asistente disponible como interfaz visual.', ...idle });
export const usePostulanteChatHistorial = () => view('postulante:chat:historial', () => ({ cargarHistorial: async () => [{ rol: 'assistant', contenido: 'Hola Andrea, puedes revisar las secciones del panel.' }], ...idle }));
export const useRecomendacionVacantesIA = () => view('postulante:recomendaciones', () => ({ recomendarVacantes: async () => {
  const recomendaciones = rows('vacantes').slice(0, 3).map((vacante, index) => ({ id_vacante: vacante.id_vacante, vacante, puntuacion: 95 - index * 6, motivo: 'Contenido de muestra.' }));
  return { success: true, ok: true, auth: true, recomendaciones, data: { recomendaciones } };
}, ...idle }));
export const useAnalisisCvIA = () => ({ analizarCV: async () => ({ ok: true, resumen: 'Vista previa de análisis.', fortalezas: [], recomendaciones: [] }), ...idle });
export const usePostulacionesEntrevistaIA = () => ({ listarPostulaciones: async () => rows('postulaciones').filter((row) => row.id_usuario === 3), ...idle });
export const useEntrevistaIA = () => view('postulante:entrevista', () => ({ iniciarEntrevista: async () => ({ ok: true, mensaje: 'Hola, comencemos con una breve entrevista de práctica.' }), responderEntrevista: async () => ({ ok: true, mensaje: 'Gracias por tu respuesta. Cuéntame sobre una habilidad que te ayude en este puesto.' }), finalizarEntrevista: () => result({}), ...idle }));
export const usePostulanteResource = (resource) => query(resource);
export const usePostulanteAction = () => useApiAction();

export const demoUsers = {
  administrador: { id_usuario: 1, nombre: 'María López', rol: 'administrador' },
  reclutador: { id_usuario: 2, nombre: 'Carlos Ramírez', rol: 'reclutador' },
  postulante: { id_usuario: 3, nombre: 'Andrea Martínez', rol: 'postulante' },
};

export function rolCanonico(user = {}) {
  const role = typeof user === 'object' ? user.rol ?? user.nombre_rol ?? user.id_rol : user;
  if (Number(role) === 1) return 'administrador';
  if (Number(role) === 2) return 'postulante';
  if (Number(role) === 3) return 'reclutador';
  return String(role).toLowerCase() === 'admin' ? 'administrador' : String(role).toLowerCase();
}

export const rutaPorRol = (role) => ({ administrador: '/admin', reclutador: '/reclutador', postulante: '/postulante' })[rolCanonico(role)] ?? '/login';
export const resolveAssetUrl = (src) => src ? String(src).replace(/^\/+/, '/') : '';
export const normalizarUsuarioSesion = (user = {}, fallback = {}) => ({ ...fallback, ...user, rol: rolCanonico(user) || user.rol, rol_canonico: rolCanonico(user) });
export const rolPermitido = () => true;
export const limpiarSesionLocal = () => {};
export const useSesion = ({ fallbackUser = null } = {}) => ({ user: fallbackUser ?? demoUsers.postulante, session: { auth: false, allowed: true }, auth: false, allowed: true, loading: false, error: null, login: async () => ({ login: { success: true }, session: { auth: false, allowed: true, user: fallbackUser ?? demoUsers.postulante } }), logout: async () => ({ success: true }), refetch: async () => ({ auth: false, allowed: true, user: fallbackUser ?? demoUsers.postulante }) });
export const useRegistroSesion = () => ({ registrar: async (_type, data = {}) => result({ user: data }), ...idle });
export const useRecuperarPassword = () => ({ recuperar: async () => result({ message: 'Vista previa de recuperación.' }), ...idle });
export const loginSesion = async () => ({ success: true, user: demoUsers.postulante });
export const registrarUsuario = async (_type, data = {}) => result({ user: data });
export const recuperarPassword = async () => result({});
export const obtenerSesion = async () => ({ auth: false, allowed: true, user: demoUsers.postulante });
export const requerirSesion = obtenerSesion;
export const loginYObtenerSesion = async () => ({ login: { success: true }, session: await obtenerSesion() });
export const cerrarSesion = async () => ({ success: true });

export const useGoogleDomain = () => ({ loginConGoogle: async () => ({ success: true, user: demoUsers.postulante }), loading: false, error: null });
export const useGoogle = useGoogleDomain;
export const useComentariosPublicos = () => view('publico:comentarios', () => ({ cargarComentarios: async () => [], publicarComentario: async () => [], loading: false, error: null }));
