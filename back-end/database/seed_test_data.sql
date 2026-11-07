-- Datos de prueba locales para probar los portales de InclusiJob.
--
-- Uso: ejecutar en phpMyAdmin seleccionando la base de datos `inclusijob`.
-- Todas las filas creadas por este archivo usan correos `demo-*` o nombres
-- `Demo ...`; el bloque de limpieza solo elimina esas filas.
-- Credenciales de todas las cuentas: Demo1234!
-- No ejecutar en producción.

SET NAMES utf8mb4;
START TRANSACTION;

-- Limpieza idempotente: hijos primero para respetar las llaves foráneas.
DELETE FROM chabots
WHERE id_usuario IN (
  SELECT id_usuario FROM usuarios WHERE correo LIKE 'demo-%@local.test'
);

DELETE FROM tokens
WHERE id_usuario IN (
  SELECT id_usuario FROM usuarios WHERE correo LIKE 'demo-%@local.test'
);

DELETE FROM reporte_vacante
WHERE id_usuario IN (
  SELECT id_usuario FROM usuarios WHERE correo LIKE 'demo-%@local.test'
)
OR id_vacante IN (
  SELECT id_vacante FROM vacantes WHERE titulo_puesto LIKE 'Demo Vacante %'
);

DELETE FROM postulaciones
WHERE id_postulante IN (
  SELECT id_postulante
  FROM postulantes
  WHERE id_usuario IN (
    SELECT id_usuario FROM usuarios WHERE correo LIKE 'demo-%@local.test'
  )
)
OR id_vacante IN (
  SELECT id_vacante FROM vacantes WHERE titulo_puesto LIKE 'Demo Vacante %'
);

DELETE FROM certificaciones
WHERE id_postulante IN (
  SELECT id_postulante
  FROM postulantes
  WHERE id_usuario IN (
    SELECT id_usuario FROM usuarios WHERE correo LIKE 'demo-%@local.test'
  )
);

DELETE FROM vacante_discapacidad
WHERE id_vacante IN (
  SELECT id_vacante FROM vacantes WHERE titulo_puesto LIKE 'Demo Vacante %'
);

DELETE FROM postulante_discapacidad
WHERE id_postulante IN (
  SELECT id_postulante
  FROM postulantes
  WHERE id_usuario IN (
    SELECT id_usuario FROM usuarios WHERE correo LIKE 'demo-%@local.test'
  )
);

DELETE FROM vacantes
WHERE titulo_puesto LIKE 'Demo Vacante %';

DELETE FROM reclutadores
WHERE id_usuario IN (
  SELECT id_usuario FROM usuarios WHERE correo LIKE 'demo-%@local.test'
);

DELETE FROM postulantes
WHERE id_usuario IN (
  SELECT id_usuario FROM usuarios WHERE correo LIKE 'demo-%@local.test'
);

DELETE FROM empresas
WHERE nombre_empresas LIKE 'Demo Empresa %';

DELETE FROM usuarios
WHERE correo LIKE 'demo-%@local.test';

-- Cuentas de prueba: admin, dos postulantes y tres reclutadores.
INSERT INTO usuarios
  (nombres, apellidos, correo, `contraseña`, telefono, estado, fecha_registro, correo_validado, id_rol)
VALUES
  ('Demo', 'Administrador', 'demo-admin@local.test', '$2y$10$5GF7RseuL6lBzUlc2IgLpO4Sp3R.G53m.WeaoxWrdege7osaoGxtK', '5551000001', 1, '2026-11-02 09:00:00', 1, 1),
  ('Ana', 'López Martínez', 'demo-ana@local.test', '$2y$10$5GF7RseuL6lBzUlc2IgLpO4Sp3R.G53m.WeaoxWrdege7osaoGxtK', '5551000002', 1, '2026-11-02 09:05:00', 1, 2),
  ('Carlos', 'Hernández Ruiz', 'demo-carlos@local.test', '$2y$10$5GF7RseuL6lBzUlc2IgLpO4Sp3R.G53m.WeaoxWrdege7osaoGxtK', '5551000003', 1, '2026-11-02 09:10:00', 1, 2),
  ('Laura', 'Sánchez Torres', 'demo-laura@local.test', '$2y$10$5GF7RseuL6lBzUlc2IgLpO4Sp3R.G53m.WeaoxWrdege7osaoGxtK', '5551000004', 1, '2026-11-02 09:15:00', 1, 3),
  ('Miguel', 'Pérez Gómez', 'demo-miguel@local.test', '$2y$10$5GF7RseuL6lBzUlc2IgLpO4Sp3R.G53m.WeaoxWrdege7osaoGxtK', '5551000005', 1, '2026-11-02 09:20:00', 1, 3),
  ('Sofía', 'Ramírez Díaz', 'demo-sofia@local.test', '$2y$10$5GF7RseuL6lBzUlc2IgLpO4Sp3R.G53m.WeaoxWrdege7osaoGxtK', '5551000006', 1, '2026-11-02 09:25:00', 1, 3);

SET @id_ana = (SELECT id_usuario FROM usuarios WHERE correo = 'demo-ana@local.test');
SET @id_carlos = (SELECT id_usuario FROM usuarios WHERE correo = 'demo-carlos@local.test');
SET @id_laura = (SELECT id_usuario FROM usuarios WHERE correo = 'demo-laura@local.test');
SET @id_miguel = (SELECT id_usuario FROM usuarios WHERE correo = 'demo-miguel@local.test');
SET @id_sofia = (SELECT id_usuario FROM usuarios WHERE correo = 'demo-sofia@local.test');

-- Empresas en tres estados: aprobada, pendiente y rechazada.
INSERT INTO empresas
  (nombre_empresas, descripcion, direccion, telefono_empresa, correo_empresa, sitio_web, rfc, estado_validacion, motivo_rechazo, fecha_registro_empres)
VALUES
  ('Demo Empresa Accesible', 'Consultoría de tecnología con equipos inclusivos.', 'Av. Reforma 101, Ciudad de México', '5552000001', 'demo-accesible@local.test', 'https://demo-accesible.local.test', 'DEA260101AA1', 1, NULL, '2026-10-20 09:00:00'),
  ('Demo Empresa Pendiente', 'Empresa de servicios que espera validación.', 'Calle del Trabajo 202, Guadalajara', '5552000002', 'demo-pendiente@local.test', NULL, 'DEP260101AA2', 0, NULL, '2026-10-25 10:30:00'),
  ('Demo Empresa Rechazada', 'Registro de prueba para revisar el motivo de rechazo.', 'Blvd. Inclusión 303, Monterrey', '5552000003', 'demo-rechazada@local.test', NULL, 'DER260101AA3', 2, 'Falta documentación de la empresa.', '2026-10-28 11:45:00');

SET @id_empresa_accesible = (SELECT id_empresas FROM empresas WHERE nombre_empresas = 'Demo Empresa Accesible');
SET @id_empresa_pendiente = (SELECT id_empresas FROM empresas WHERE nombre_empresas = 'Demo Empresa Pendiente');
SET @id_empresa_rechazada = (SELECT id_empresas FROM empresas WHERE nombre_empresas = 'Demo Empresa Rechazada');

INSERT INTO reclutadores (puesto, sector, id_usuario, id_empresas)
VALUES
  ('Coordinadora de talento', 'Tecnología', @id_laura, @id_empresa_accesible),
  ('Analista de selección', 'Servicios', @id_miguel, @id_empresa_pendiente),
  ('Gerente de recursos humanos', 'Consultoría', @id_sofia, @id_empresa_rechazada);

-- Perfiles de postulantes con distinta información para probar estados llenos.
INSERT INTO postulantes
  (descripcion_discapacidad, esfuerzo_fisico_posible, experiencia, habilidades, cv, portafolio_url, id_usuario)
VALUES
  ('Prefiere espacios accesibles y comunicación escrita.', 0, 'Tres años en soporte técnico y documentación de procesos.', 'Atención al cliente, documentación, herramientas digitales', NULL, 'https://portfolio.demo-ana.local.test', @id_ana),
  ('Puede trabajar con pausas activas y horario flexible.', 1, 'Dos años como analista de datos junior.', 'Excel, SQL, visualización de datos', NULL, 'https://portfolio.demo-carlos.local.test', @id_carlos);

SET @id_ana_postulante = (SELECT id_postulante FROM postulantes WHERE id_usuario = @id_ana);
SET @id_carlos_postulante = (SELECT id_postulante FROM postulantes WHERE id_usuario = @id_carlos);

INSERT INTO postulante_discapacidad (id_postulante, id_tipo_discapacidad)
SELECT @id_ana_postulante, id_tipo_discapacidad FROM tipo_discapacidad WHERE nombre_discapacidad = 'Auditiva';
INSERT INTO postulante_discapacidad (id_postulante, id_tipo_discapacidad)
SELECT @id_carlos_postulante, id_tipo_discapacidad FROM tipo_discapacidad WHERE nombre_discapacidad = 'Motriz';

INSERT INTO certificaciones
  (nombre_certificacion, institucion_dada, pdf, fecha_emitido, id_postulante)
VALUES
  ('Soporte técnico accesible', 'Centro Demo de Tecnología', NULL, '2025-06-15', @id_ana_postulante),
  ('Fundamentos de análisis de datos', 'Academia Demo Digital', NULL, '2025-11-20', @id_carlos_postulante);

SET @id_laura_reclutador = (SELECT id_reclutador FROM reclutadores WHERE id_usuario = @id_laura);

-- Vacantes con estados distintos para probar listados, filtros y detalle.
INSERT INTO vacantes
  (titulo_puesto, descripcion_puesto, requisitos, modalidad, salario_min, salario_max, estado, fecha_publicacion, fecha_cierre, id_reclutador)
VALUES
  ('Demo Vacante Soporte técnico', 'Atiende solicitudes y documenta soluciones para clientes.', 'Comunicación clara y experiencia con herramientas digitales.', 'Remoto', 14000.00, 19000.00, 'activa', '2026-10-05 09:00:00', NULL, @id_laura_reclutador),
  ('Demo Vacante Analista de datos', 'Construye reportes accesibles para las áreas de negocio.', 'SQL, hojas de cálculo y análisis descriptivo.', 'Hibrido', 18000.00, 24000.00, 'activa', '2026-10-12 10:00:00', NULL, @id_laura_reclutador),
  ('Demo Vacante Diseñador UX', 'Mejora flujos digitales considerando accesibilidad.', 'Portafolio y conocimiento de diseño inclusivo.', 'Remoto', 20000.00, 28000.00, 'pausada', '2026-09-18 08:30:00', NULL, @id_laura_reclutador),
  ('Demo Vacante Auxiliar administrativo', 'Apoya la organización de documentos y agenda.', 'Organización y manejo de correo electrónico.', 'Presencial', 10000.00, 13000.00, 'cerrada', '2026-08-20 09:30:00', '2026-10-01', @id_laura_reclutador),
  ('Demo Vacante Archivada', 'Registro para probar una vacante suspendida.', 'N/A', 'Remoto', NULL, NULL, 'eliminada', '2026-07-10 09:00:00', '2026-08-01', @id_laura_reclutador),
  ('Demo Vacante QA manual', 'Realiza pruebas funcionales y reporta hallazgos.', 'Pruebas web, documentación y atención al detalle.', 'Remoto', 16000.00, 22000.00, 'activa', '2026-10-20 09:15:00', NULL, @id_laura_reclutador),
  ('Demo Vacante Diseñador gráfico', 'Crea materiales digitales para campañas inclusivas.', 'Figma, herramientas de diseño y portafolio.', 'Hibrido', 15000.00, 21000.00, 'activa', '2026-10-22 10:00:00', NULL, @id_laura_reclutador),
  ('Demo Vacante Ejecutivo de atención', 'Acompaña a clientes por canales digitales accesibles.', 'Comunicación escrita y manejo de CRM.', 'Remoto', 12000.00, 17000.00, 'pausada', '2026-09-25 11:00:00', NULL, @id_laura_reclutador),
  ('Demo Vacante Auxiliar contable', 'Apoya conciliaciones y control de comprobantes.', 'Excel, organización y seguimiento de procesos.', 'Presencial', 13000.00, 18000.00, 'cerrada', '2026-08-28 09:45:00', '2026-10-15', @id_laura_reclutador),
  ('Demo Vacante Community manager', 'Gestiona contenidos y conversaciones en redes sociales.', 'Redacción, métricas y calendario editorial.', 'Hibrido', 14000.00, 20000.00, 'activa', '2026-10-26 12:00:00', NULL, @id_laura_reclutador);

SET @id_vacante_soporte = (SELECT id_vacante FROM vacantes WHERE titulo_puesto = 'Demo Vacante Soporte técnico');
SET @id_vacante_datos = (SELECT id_vacante FROM vacantes WHERE titulo_puesto = 'Demo Vacante Analista de datos');
SET @id_vacante_ux = (SELECT id_vacante FROM vacantes WHERE titulo_puesto = 'Demo Vacante Diseñador UX');
SET @id_vacante_auxiliar = (SELECT id_vacante FROM vacantes WHERE titulo_puesto = 'Demo Vacante Auxiliar administrativo');
SET @id_vacante_archivada = (SELECT id_vacante FROM vacantes WHERE titulo_puesto = 'Demo Vacante Archivada');
SET @id_vacante_qa = (SELECT id_vacante FROM vacantes WHERE titulo_puesto = 'Demo Vacante QA manual');
SET @id_vacante_grafico = (SELECT id_vacante FROM vacantes WHERE titulo_puesto = 'Demo Vacante Diseñador gráfico');
SET @id_vacante_atencion = (SELECT id_vacante FROM vacantes WHERE titulo_puesto = 'Demo Vacante Ejecutivo de atención');
SET @id_vacante_contable = (SELECT id_vacante FROM vacantes WHERE titulo_puesto = 'Demo Vacante Auxiliar contable');
SET @id_vacante_community = (SELECT id_vacante FROM vacantes WHERE titulo_puesto = 'Demo Vacante Community manager');

INSERT INTO vacante_discapacidad (id_vacante, id_tipo_discapacidad)
SELECT @id_vacante_soporte, id_tipo_discapacidad FROM tipo_discapacidad WHERE nombre_discapacidad IN ('Auditiva', 'Visual');
INSERT INTO vacante_discapacidad (id_vacante, id_tipo_discapacidad)
SELECT @id_vacante_datos, id_tipo_discapacidad FROM tipo_discapacidad WHERE nombre_discapacidad IN ('Motriz', 'Auditiva');
INSERT INTO vacante_discapacidad (id_vacante, id_tipo_discapacidad)
SELECT @id_vacante_ux, id_tipo_discapacidad FROM tipo_discapacidad WHERE nombre_discapacidad = 'Motriz';
INSERT INTO vacante_discapacidad (id_vacante, id_tipo_discapacidad)
SELECT @id_vacante_qa, id_tipo_discapacidad FROM tipo_discapacidad WHERE nombre_discapacidad IN ('Auditiva', 'Motriz');
INSERT INTO vacante_discapacidad (id_vacante, id_tipo_discapacidad)
SELECT @id_vacante_grafico, id_tipo_discapacidad FROM tipo_discapacidad WHERE nombre_discapacidad = 'Auditiva';
INSERT INTO vacante_discapacidad (id_vacante, id_tipo_discapacidad)
SELECT @id_vacante_atencion, id_tipo_discapacidad FROM tipo_discapacidad WHERE nombre_discapacidad IN ('Auditiva', 'Visual');
INSERT INTO vacante_discapacidad (id_vacante, id_tipo_discapacidad)
SELECT @id_vacante_community, id_tipo_discapacidad FROM tipo_discapacidad WHERE nombre_discapacidad = 'Motriz';

INSERT INTO postulaciones (estado, fecha_postulacion, id_postulante, id_vacante)
VALUES
  ('pendiente', '2026-10-15 12:00:00', @id_ana_postulante, @id_vacante_soporte),
  ('aceptado', '2026-10-16 12:30:00', @id_carlos_postulante, @id_vacante_datos),
  ('rechazado', '2026-09-20 14:10:00', @id_ana_postulante, @id_vacante_ux),
  ('pendiente', '2026-09-21 15:20:00', @id_carlos_postulante, @id_vacante_auxiliar);

INSERT INTO reporte_vacante (motivo, fecha_reporte, id_vacante, id_usuario)
VALUES
  ('La descripción de prueba necesita información adicional.', '2026-10-18 16:00:00', @id_vacante_archivada, @id_ana);

COMMIT;

-- Verificación rápida: debe devolver 6 usuarios, 3 empresas, 10 vacantes,
-- 2 postulantes, 4 postulaciones y 1 reporte creados por este seed.
SELECT
  (SELECT COUNT(*) FROM usuarios WHERE correo LIKE 'demo-%@local.test') AS usuarios_demo,
  (SELECT COUNT(*) FROM empresas WHERE nombre_empresas LIKE 'Demo Empresa %') AS empresas_demo,
  (SELECT COUNT(*) FROM postulantes WHERE id_usuario IN (SELECT id_usuario FROM usuarios WHERE correo LIKE 'demo-%@local.test')) AS postulantes_demo,
  (SELECT COUNT(*) FROM vacantes WHERE titulo_puesto LIKE 'Demo Vacante %') AS vacantes_demo,
  (SELECT COUNT(*) FROM postulaciones p JOIN vacantes v ON v.id_vacante = p.id_vacante WHERE v.titulo_puesto LIKE 'Demo Vacante %') AS postulaciones_demo,
  (SELECT COUNT(*) FROM reporte_vacante r JOIN vacantes v ON v.id_vacante = r.id_vacante WHERE v.titulo_puesto LIKE 'Demo Vacante %') AS reportes_demo;

