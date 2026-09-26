import { fixtures } from './fixtures.js';

const copy = (value) => structuredClone(value);
const rows = (collection) => copy(fixtures[collection] ?? []);
const find = (collection, id) => rows(collection).find((row) => String(row.id ?? row.id_vacante ?? row.id_empresas ?? row.id_usuario ?? row.id_postulacion ?? row.id_reporte) === String(id)) ?? null;
const success = (data) => ({ success: true, ok: true, data: copy(data) });
const recruiterVacancy = (vacancy = {}) => ({ ...vacancy, titulo_puesto: vacancy.titulo, estado_vacante: vacancy.estado, fecha_creacion: vacancy.fecha_publicacion });

export function readInterfaceResource(resource = '') {
  const key = String(resource).split('?')[0];
  const id = key.split(':').at(-1);
  const collections = {
    'admin:empresas': () => ({ empresas: rows('empresas'), total: fixtures.empresas.length }),
    'admin:usuarios': () => ({ usuarios: rows('usuarios'), total: fixtures.usuarios.length }),
    'admin:vacantes': () => ({ vacantes: rows('vacantes'), total: fixtures.vacantes.length }),
    'admin:postulaciones': () => ({ postulaciones: rows('postulaciones'), total: fixtures.postulaciones.length }),
    'admin:discapacidades': () => ({ discapacidades: rows('discapacidades'), total: fixtures.discapacidades.length }),
    'admin:reportes': () => ({ reportes: rows('reportes'), total: fixtures.reportes.length }),
    'reclutador:vacantes': () => rows('vacantes').map(recruiterVacancy),
    'reclutador:dashboard': () => ({ nombre_reclutador: 'Carlos Ramírez', empresa: 'Nexo Digital', total_vacantes: 4, vacantes_activas: 3, candidatos_nuevos: 6, entrevistas_pendientes: 2, vacantes_recientes: rows('vacantes').slice(0, 3).map(recruiterVacancy), postulaciones_recientes: rows('postulaciones').slice(0, 4) }),
    'reclutador:discapacidades': () => ({ discapacidades: rows('discapacidades') }),
    'reclutador:empresa': () => find('empresas', 1),
    'reclutador:perfil': () => ({ ...find('usuarios', 2), telefono: '5550010101', cargo: 'Especialista de talento' }),
    'reclutador:reportes': () => rows('reportes'),
    'reclutador:candidatos': () => rows('vacantes').map((vacante) => ({ ...recruiterVacancy(vacante), candidatos: rows('candidatos') })),
    'postulante:dashboard': () => ({ vacantes_recomendadas: rows('vacantes').slice(0, 3), postulaciones_recientes: rows('postulaciones').filter((row) => row.id_usuario === 3), perfil_completo: 82, total_postulaciones: 2, entrevistas_pendientes: 1 }),
    'postulante:vacantes': () => ({ vacantes: rows('vacantes') }),
    'postulante:postulaciones': () => ({ postulaciones: rows('postulaciones').filter((row) => row.id_usuario === 3) }),
    'postulante:reportes': () => ({ reportes: rows('reportes').filter((row) => row.reportante === 'Andrea Martínez') }),
    'postulante:perfil': () => ({ ...find('usuarios', 3), telefono: '5550011001', ciudad: 'Ciudad de México', discapacidad: 'Motriz', habilidades: ['Figma', 'Investigación UX', 'Accesibilidad'], experiencia: 'Diseñadora UX con experiencia en productos digitales.' }),
  };

  if (key === 'admin:dashboard') {
    const empresas = rows('empresas');
    const vacantes = rows('vacantes');
    return success({ total_usuarios: fixtures.usuarios.length, total_empresas: empresas.length, total_vacantes: vacantes.length, total_postulaciones: fixtures.postulaciones.length, actividad_mensual: [{ mes: 'May', usuarios: 12, vacantes: 4 }, { mes: 'Jun', usuarios: 18, vacantes: 7 }, { mes: 'Jul', usuarios: 23, vacantes: 9 }, { mes: 'Ago', usuarios: 31, vacantes: 12 }, { mes: 'Sep', usuarios: 39, vacantes: 15 }], ultimas_vacantes: vacantes.slice(0, 4), empresas_pendientes_lista: empresas.filter((empresa) => empresa.estado === 'pendiente') });
  }
  if (key.startsWith('admin:empresa:')) return success({ empresa: find('empresas', id), vacantes: rows('vacantes').filter((vacante) => vacante.nombre_empresa === find('empresas', id)?.nombre_empresa) });
  if (key.startsWith('admin:usuario:')) return success({ usuario: find('usuarios', id), postulaciones: rows('postulaciones').filter((row) => String(row.id_usuario) === String(id)) });
  if (key.startsWith('admin:vacante:')) return success({ vacante: find('vacantes', id), postulaciones: rows('postulaciones').filter((row) => String(row.id_vacante) === String(id)) });
  if (key.startsWith('admin:postulacion:')) return success({ postulacion: find('postulaciones', id), candidato: find('candidatos', find('postulaciones', id)?.id_usuario), vacante: find('vacantes', find('postulaciones', id)?.id_vacante) });
  if (key.startsWith('reclutador:vacante:')) return success({ vacante: recruiterVacancy(find('vacantes', id) ?? fixtures.vacantes[0]), postulaciones: rows('postulaciones').filter((row) => String(row.id_vacante) === String(id)) });
  return success(collections[key]?.() ?? {});
}

export async function interfaceAction(payload = {}) {
  return { success: true, ok: true, data: copy(payload), message: 'Acción disponible solo como interfaz visual.' };
}
