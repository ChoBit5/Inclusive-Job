export const fixtures = {
  empresas: [{
    id_empresas: 1,
    nombre_empresa: 'Nexo Digital',
    rfc: 'NED180417AB2',
    correo: 'talento@nexodigital.mx',
    telefono: '5550010101',
    estado: 'aprobada',
    vacantes: 4,
    fecha_registro: '2026-08-12'
  }, {
    id_empresas: 2,
    nombre_empresa: 'Marea Studio',
    rfc: 'MAS190724CD3',
    correo: 'equipo@mareastudio.mx',
    telefono: '5550010102',
    estado: 'pendiente',
    vacantes: 2,
    fecha_registro: '2026-09-01'
  }, {
    id_empresas: 3,
    nombre_empresa: 'Rutas Urbanas',
    rfc: 'RUU170310EF4',
    correo: 'contacto@rutasurbanas.mx',
    telefono: '5550010103',
    estado: 'aprobada',
    vacantes: 5,
    fecha_registro: '2026-07-20'
  }, {
    id_empresas: 4,
    nombre_empresa: 'Lumen Servicios',
    rfc: 'LUS200109GH5',
    correo: 'personas@lumen.mx',
    telefono: '5550010104',
    estado: 'suspendida',
    vacantes: 1,
    fecha_registro: '2026-06-18'
  }],
  usuarios: [{
    id_usuario: 1,
    nombre: 'María López',
    nombres: 'María',
    apellido: 'López',
    correo: 'maria@inclusivejob.mx',
    rol: 'administrador',
    estado: 'activo',
    fecha_registro: '2026-01-05'
  }, {
    id_usuario: 2,
    nombre: 'Carlos Ramírez',
    nombres: 'Carlos',
    apellido: 'Ramírez',
    correo: 'carlos@nexodigital.mx',
    rol: 'reclutador',
    estado: 'activo',
    fecha_registro: '2026-02-14'
  }, {
    id_usuario: 3,
    nombre: 'Andrea Martínez',
    nombres: 'Andrea',
    apellido: 'Martínez',
    correo: 'andrea@email.mx',
    rol: 'postulante',
    estado: 'activo',
    fecha_registro: '2026-03-22'
  }, {
    id_usuario: 4,
    nombre: 'Diego Torres',
    nombres: 'Diego',
    apellido: 'Torres',
    correo: 'diego@email.mx',
    rol: 'postulante',
    estado: 'activo',
    fecha_registro: '2026-04-09'
  }],
  vacantes: [{
    id_vacante: 1,
    titulo: 'Diseñador/a UX',
    empresa: 'Nexo Digital',
    nombre_empresa: 'Nexo Digital',
    ubicacion: 'Ciudad de México',
    modalidad: 'Híbrido',
    tipo_contrato: 'Tiempo completo',
    salario_min: 22000,
    salario_max: 28000,
    estado: 'activa',
    descripcion: 'Diseña experiencias digitales accesibles para productos con impacto.',
    fecha_publicacion: '2026-09-05',
    habilidades: ['Figma', 'Investigación UX', 'Accesibilidad']
  }, {
    id_vacante: 2,
    titulo: 'Analista de datos',
    empresa: 'Marea Studio',
    nombre_empresa: 'Marea Studio',
    ubicacion: 'Remoto',
    modalidad: 'Remoto',
    tipo_contrato: 'Tiempo completo',
    salario_min: 24000,
    salario_max: 30000,
    estado: 'activa',
    descripcion: 'Transforma datos en decisiones para equipos creativos.',
    fecha_publicacion: '2026-09-08',
    habilidades: ['SQL', 'Power BI', 'Excel']
  }, {
    id_vacante: 3,
    titulo: 'Asistente administrativo',
    empresa: 'Rutas Urbanas',
    nombre_empresa: 'Rutas Urbanas',
    ubicacion: 'Guadalajara',
    modalidad: 'Presencial',
    tipo_contrato: 'Medio tiempo',
    salario_min: 12000,
    salario_max: 15000,
    estado: 'activa',
    descripcion: 'Apoya la operación administrativa y atención a proveedores.',
    fecha_publicacion: '2026-09-10',
    habilidades: ['Organización', 'Comunicación', 'Office']
  }, {
    id_vacante: 4,
    titulo: 'Desarrollador/a Front-end',
    empresa: 'Nexo Digital',
    nombre_empresa: 'Nexo Digital',
    ubicacion: 'Remoto',
    modalidad: 'Remoto',
    tipo_contrato: 'Tiempo completo',
    salario_min: 30000,
    salario_max: 38000,
    estado: 'cerrada',
    descripcion: 'Construye interfaces web rápidas e inclusivas.',
    fecha_publicacion: '2026-08-15',
    habilidades: ['React', 'JavaScript', 'CSS']
  }],
  postulaciones: [{
    id_postulacion: 1,
    id_vacante: 1,
    id_usuario: 3,
    titulo: 'Diseñador/a UX',
    nombre_vacante: 'Diseñador/a UX',
    empresa: 'Nexo Digital',
    nombre_empresa: 'Nexo Digital',
    candidato: 'Andrea Martínez',
    estado: 'En revisión',
    fecha_postulacion: '2026-09-11',
    puntuacion: 88
  }, {
    id_postulacion: 2,
    id_vacante: 2,
    id_usuario: 4,
    titulo: 'Analista de datos',
    nombre_vacante: 'Analista de datos',
    empresa: 'Marea Studio',
    nombre_empresa: 'Marea Studio',
    candidato: 'Diego Torres',
    estado: 'Entrevista',
    fecha_postulacion: '2026-09-12',
    puntuacion: 82
  }, {
    id_postulacion: 3,
    id_vacante: 3,
    id_usuario: 3,
    titulo: 'Asistente administrativo',
    nombre_vacante: 'Asistente administrativo',
    empresa: 'Rutas Urbanas',
    nombre_empresa: 'Rutas Urbanas',
    candidato: 'Andrea Martínez',
    estado: 'Aceptada',
    fecha_postulacion: '2026-09-02',
    puntuacion: 91
  }, {
    id_postulacion: 4,
    id_vacante: 4,
    id_usuario: 4,
    titulo: 'Desarrollador/a Front-end',
    nombre_vacante: 'Desarrollador/a Front-end',
    empresa: 'Nexo Digital',
    nombre_empresa: 'Nexo Digital',
    candidato: 'Diego Torres',
    estado: 'Rechazada',
    fecha_postulacion: '2026-08-22',
    puntuacion: 70
  }],
  discapacidades: [{
    id_discapacidad: 1,
    nombre: 'Motriz',
    descripcion: 'Condición que puede requerir ajustes físicos o de movilidad.',
    estado: 'activo'
  }, {
    id_discapacidad: 2,
    nombre: 'Visual',
    descripcion: 'Condición que requiere formatos y tecnologías accesibles.',
    estado: 'activo'
  }, {
    id_discapacidad: 3,
    nombre: 'Auditiva',
    descripcion: 'Condición que puede requerir apoyos de comunicación.',
    estado: 'activo'
  }, {
    id_discapacidad: 4,
    nombre: 'Psicosocial',
    descripcion: 'Condición que puede requerir entornos y procesos flexibles.',
    estado: 'activo'
  }],
  reportes: [{
    id_reporte: 1,
    id_vacante: 2,
    titulo: 'Analista de datos',
    motivo: 'La descripción no especifica los ajustes disponibles.',
    estado: 'pendiente',
    fecha_reporte: '2026-09-13',
    reportante: 'Andrea Martínez'
  }, {
    id_reporte: 2,
    id_vacante: 3,
    titulo: 'Asistente administrativo',
    motivo: 'Solicito revisar el rango salarial publicado.',
    estado: 'en revisión',
    fecha_reporte: '2026-09-14',
    reportante: 'Diego Torres'
  }, {
    id_reporte: 3,
    id_vacante: 1,
    titulo: 'Diseñador/a UX',
    motivo: 'La información de contacto requiere actualización.',
    estado: 'atendido',
    fecha_reporte: '2026-09-07',
    reportante: 'Andrea Martínez'
  }, {
    id_reporte: 4,
    id_vacante: 4,
    titulo: 'Desarrollador/a Front-end',
    motivo: 'Vacante ya cubierta.',
    estado: 'cerrado',
    fecha_reporte: '2026-08-28',
    reportante: 'Diego Torres'
  }],
  candidatos: [{
    id_usuario: 3,
    nombre: 'Andrea Martínez',
    correo: 'andrea@email.mx',
    telefono: '5550011001',
    discapacidad: 'Motriz',
    experiencia: 'Diseñadora UX con 4 años de experiencia.',
    habilidades: ['Figma', 'Investigación UX', 'Accesibilidad'],
    puntuacion: 88
  }, {
    id_usuario: 4,
    nombre: 'Diego Torres',
    correo: 'diego@email.mx',
    telefono: '5550011002',
    discapacidad: 'Visual',
    experiencia: 'Analista de datos con 3 años de experiencia.',
    habilidades: ['SQL', 'Power BI', 'Excel'],
    puntuacion: 82
  }, {
    id_usuario: 5,
    nombre: 'Sofía Hernández',
    correo: 'sofia@email.mx',
    telefono: '5550011003',
    discapacidad: 'Auditiva',
    experiencia: 'Asistente administrativa con experiencia en atención.',
    habilidades: ['Office', 'Organización', 'Comunicación'],
    puntuacion: 80
  }, {
    id_usuario: 6,
    nombre: 'Jorge Núñez',
    correo: 'jorge@email.mx',
    telefono: '5550011004',
    discapacidad: 'Psicosocial',
    experiencia: 'Desarrollador front-end especializado en React.',
    habilidades: ['React', 'JavaScript', 'CSS'],
    puntuacion: 90
  }]
};
