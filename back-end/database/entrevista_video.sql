-- Tabla exclusiva para el video de verificacion de la entrevista real
-- y el informe que genera Gemini. Importar en la BD `inclusijob`
-- (phpMyAdmin > inclusijob > Importar). Se puede importar mas de una vez.

CREATE TABLE IF NOT EXISTS `entrevista_video` (
  `id_entrevista_video` int(11) NOT NULL AUTO_INCREMENT,
  `id_postulacion` int(11) NOT NULL,
  `video` longblob DEFAULT NULL,
  `tipo_video` varchar(50) NOT NULL,
  `tamano_bytes` int(10) unsigned NOT NULL DEFAULT 0,
  `camara_interrumpida` tinyint(1) NOT NULL DEFAULT 0,
  `video_visto` tinyint(1) NOT NULL DEFAULT 0,
  `fecha_visto` datetime DEFAULT NULL,
  `estado_analisis` enum('pendiente','procesando','completado','error') NOT NULL DEFAULT 'pendiente',
  `informe_ia` mediumtext DEFAULT NULL,
  `sugiere_revision` tinyint(1) DEFAULT NULL,
  `error_analisis` varchar(255) DEFAULT NULL,
  `intentos_analisis` smallint(6) NOT NULL DEFAULT 0,
  `fecha_analisis` datetime DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_entrevista_video`),
  UNIQUE KEY `uq_entrevista_video_postulacion` (`id_postulacion`),
  CONSTRAINT `fk_entrevista_video_postulacion`
    FOREIGN KEY (`id_postulacion`) REFERENCES `postulaciones` (`id_postulacion`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
