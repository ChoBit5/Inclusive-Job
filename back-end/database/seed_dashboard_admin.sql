-- Datos de prueba: Dashboard del administrador (feature 6).
--
-- Uso: correr en phpMyAdmin, pestana SQL, BD `inclusijob`, en orden 1 -> 4.
-- Solo crea filas marcadas (`Demo ...` / `Vacante Demo ...`); no toca datos reales.
-- Reversible con el BLOQUE 5 (limpieza). No correr en produccion.
--
-- Estado del que parte (2026-10-11): 2 empresas (ambas pendientes),
-- 0 vacantes, 0 postulaciones, 0 reportes.
-- Estado esperado tras los bloques 1-3: empresas 5, pendientes 4,
-- activas 4, cerradas 2, postulaciones 2, reportes 1.

-- BLOQUE 1: empresas demo (1 aprobada + 2 pendientes con fechas escalonadas)
INSERT INTO empresas
  (nombre_empresas, descripcion, direccion, telefono_empresa, correo_empresa, sitio_web, rfc, estado_validacion, fecha_registro_empres)
VALUES
  ('Demo Dashboard Aprobada SA', 'Empresa demo aprobada', 'Calle Demo 1', '5520000001', 'demo-aprobada@local.test', 'https://demo-aprobada.local.test', 'DDA860101AA1', 1, '2026-10-11 09:00:00'),
  ('Demo Pendiente Media', 'Empresa demo pendiente', 'Calle Demo 2', '5520000002', 'demo-media@local.test', NULL, 'DPM860101AA2', 0, '2026-09-15 10:00:00'),
  ('Demo Pendiente Antigua', 'Empresa demo pendiente', 'Calle Demo 3', '5520000003', 'demo-antigua@local.test', NULL, 'DPA860101AA3', 0, '2026-08-01 10:00:00');

-- BLOQUE 2: 6 vacantes demo (reclutador 3 -> empresa 1; 4 activas + 2 cerradas).
-- Meses: May(1), Jul(1), Ago(2), Sep(1), Oct(1). Junio queda vacio a proposito
-- (la serie solo trae meses con datos) y Mayo queda fuera de las ultimas 5 (LIMIT 5).
INSERT INTO vacantes
  (titulo_puesto, descripcion_puesto, modalidad, estado, fecha_publicacion, id_reclutador)
VALUES
  ('Vacante Demo Mayo', 'Demo', 'Remoto', 'activa', '2026-05-20 10:00:00', 3),
  ('Vacante Demo Julio', 'Demo', 'Presencial', 'cerrada', '2026-07-12 10:00:00', 3),
  ('Vacante Demo Agosto 1', 'Demo', 'Hibrido', 'activa', '2026-08-15 10:00:00', 3),
  ('Vacante Demo Agosto 2', 'Demo', 'Remoto', 'activa', '2026-08-22 10:00:00', 3),
  ('Vacante Demo Septiembre', 'Demo', 'Presencial', 'cerrada', '2026-09-06 10:00:00', 3),
  ('Vacante Demo Octubre', 'Demo', 'Remoto', 'activa', '2026-10-05 10:00:00', 3);

-- BLOQUE 3: 2 postulaciones + 1 reporte sobre las vacantes demo
INSERT INTO postulaciones (estado, id_postulante, id_vacante)
  SELECT 'pendiente', 2, id_vacante FROM vacantes WHERE titulo_puesto = 'Vacante Demo Octubre' LIMIT 1;
INSERT INTO postulaciones (estado, id_postulante, id_vacante)
  SELECT 'pendiente', 3, id_vacante FROM vacantes WHERE titulo_puesto = 'Vacante Demo Septiembre' LIMIT 1;
INSERT INTO reporte_vacante (motivo, id_vacante, id_usuario)
  SELECT 'Vacante demo de prueba', id_vacante, 2 FROM vacantes WHERE titulo_puesto = 'Vacante Demo Julio' LIMIT 1;

-- BLOQUE 4: verificacion
SELECT
  (SELECT COUNT(*) FROM usuarios) AS total_usuarios,
  (SELECT COUNT(*) FROM empresas) AS total_empresas,
  (SELECT COUNT(*) FROM empresas WHERE estado_validacion = 0) AS empresas_pendientes,
  (SELECT COUNT(*) FROM vacantes WHERE estado = 'activa') AS activas,
  (SELECT COUNT(*) FROM vacantes WHERE estado = 'cerrada') AS cerradas,
  (SELECT COUNT(*) FROM postulaciones) AS postulaciones,
  (SELECT COUNT(*) FROM reporte_vacante) AS reportes;

-- BLOQUE 5: limpieza (hijos primero; solo toca filas demo)
-- DELETE FROM reporte_vacante WHERE motivo = 'Vacante demo de prueba';
-- DELETE p FROM postulaciones p JOIN vacantes v ON v.id_vacante = p.id_vacante
--   WHERE v.titulo_puesto LIKE 'Vacante Demo %';
-- DELETE FROM vacantes WHERE titulo_puesto LIKE 'Vacante Demo %';
-- DELETE FROM empresas WHERE nombre_empresas LIKE 'Demo %';
