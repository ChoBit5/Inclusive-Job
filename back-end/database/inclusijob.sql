-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 31-05-2026 a las 09:39:18
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `inclusijob`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `certificaciones`
--

CREATE TABLE `certificaciones` (
  `id_certificaciones` int(11) NOT NULL,
  `nombre_certificacion` varchar(200) NOT NULL,
  `institucion_dada` varchar(200) DEFAULT NULL,
  `pdf` varchar(500) DEFAULT NULL,
  `fecha_emitido` date DEFAULT NULL,
  `id_postulante` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `chabots`
--

CREATE TABLE `chabots` (
  `id_chatbot` int(11) NOT NULL,
  `tipo_interaccion` varchar(100) DEFAULT NULL,
  `mensaje_usuario` text DEFAULT NULL,
  `respuesta_ia` text DEFAULT NULL,
  `resultado` varchar(200) DEFAULT NULL,
  `calificacion` tinyint(4) DEFAULT NULL,
  `archivo_cv` varchar(500) DEFAULT NULL,
  `fecha` datetime NOT NULL DEFAULT current_timestamp(),
  `id_usuario` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `empresas`
--

CREATE TABLE `empresas` (
  `id_empresas` int(11) NOT NULL,
  `nombre_empresas` varchar(200) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `direccion` varchar(300) DEFAULT NULL,
  `telefono_empresa` varchar(30) DEFAULT NULL,
  `correo_empresa` varchar(150) DEFAULT NULL,
  `sitio_web` varchar(250) DEFAULT NULL,
  `estado_validacion` tinyint(1) NOT NULL DEFAULT 0,
  `fecha_registro_empres` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `postulaciones`
--

CREATE TABLE `postulaciones` (
  `id_postulacion` int(11) NOT NULL,
  `estado` varchar(50) NOT NULL DEFAULT 'pendiente',
  `fecha_postulacion` datetime NOT NULL DEFAULT current_timestamp(),
  `id_postulante` int(11) NOT NULL,
  `id_vacante` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `postulantes`
--

CREATE TABLE `postulantes` (
  `id_postulante` int(11) NOT NULL,
  `descripcion_discapacidad` text DEFAULT NULL,
  `esfuerzo_fisico_posible` tinyint(1) NOT NULL DEFAULT 0,
  `experiencia` text DEFAULT NULL,
  `habilidades` text DEFAULT NULL,
  `cv` varchar(500) DEFAULT NULL,
  `portafolio_url` varchar(500) DEFAULT NULL,
  `id_usuario` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `postulante_discapacidad`
--

CREATE TABLE `postulante_discapacidad` (
  `id_postulante` int(11) NOT NULL,
  `id_tipo_discapacidad` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reclutadores`
--

CREATE TABLE `reclutadores` (
  `id_reclutador` int(11) NOT NULL,
  `puesto` varchar(150) DEFAULT NULL,
  `id_usuario` int(11) NOT NULL,
  `id_empresas` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reporte_vacante`
--

CREATE TABLE `reporte_vacante` (
  `id_reporte` int(11) NOT NULL,
  `motivo` text NOT NULL,
  `fecha_reporte` datetime NOT NULL DEFAULT current_timestamp(),
  `id_vacante` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rol`
--

CREATE TABLE `rol` (
  `id_rol` int(11) NOT NULL,
  `nombre_rol` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `rol`
--

INSERT INTO `rol` (`id_rol`, `nombre_rol`) VALUES
(1, 'Administrador'),
(2, 'Postulante'),
(3, 'Reclutador');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tipo_discapacidad`
--

CREATE TABLE `tipo_discapacidad` (
  `id_tipo_discapacidad` int(11) NOT NULL,
  `nombre_discapacidad` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `tipo_discapacidad`
--

INSERT INTO `tipo_discapacidad` (`id_tipo_discapacidad`, `nombre_discapacidad`, `descripcion`) VALUES
(1, 'Motriz', 'Limitación en el movimiento o movilidad física'),
(2, 'Visual', 'Pérdida total o parcial de la visión'),
(3, 'Auditiva', 'Pérdida total o parcial de la audición'),
(4, 'Intelectual', 'Limitaciones en el funcionamiento intelectual'),
(5, 'Psicosocial', 'Condiciones relacionadas con la salud mental');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tokens`
--

CREATE TABLE `tokens` (
  `id_token` int(11) NOT NULL,
  `token` varchar(500) NOT NULL,
  `tipo` varchar(50) NOT NULL,
  `tiempo_expira` datetime NOT NULL,
  `veces_usado` int(11) NOT NULL DEFAULT 0,
  `tiempo_creado` datetime NOT NULL DEFAULT current_timestamp(),
  `id_usuario` int(11) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id_usuario` int(11) NOT NULL,
  `nombres` varchar(150) NOT NULL,
  `apellidos` varchar(150) NOT NULL,
  `correo` varchar(150) NOT NULL,
  `contraseña` varchar(255) NOT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `foto_perfil` varchar(500) DEFAULT NULL,
  `estado` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_registro` datetime NOT NULL DEFAULT current_timestamp(),
  `correo_validado` tinyint(1) NOT NULL DEFAULT 0,
  `id_rol` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vacantes`
--

CREATE TABLE `vacantes` (
  `id_vacante` int(11) NOT NULL,
  `titulo_puesto` varchar(200) NOT NULL,
  `descripcion_puesto` text DEFAULT NULL,
  `requisitos` text DEFAULT NULL,
  `modalidad` varchar(100) DEFAULT NULL,
  `salario_min` decimal(12,2) DEFAULT NULL,
  `salario_max` decimal(12,2) DEFAULT NULL,
  `estado` varchar(50) NOT NULL DEFAULT 'activa',
  `fecha_publicacion` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_cierre` date DEFAULT NULL,
  `id_reclutador` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `vacante_discapacidad`
--

CREATE TABLE `vacante_discapacidad` (
  `id_vacante` int(11) NOT NULL,
  `id_tipo_discapacidad` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `certificaciones`
--
ALTER TABLE `certificaciones`
  ADD PRIMARY KEY (`id_certificaciones`),
  ADD KEY `fk_cert_postulante` (`id_postulante`);

--
-- Indices de la tabla `chabots`
--
ALTER TABLE `chabots`
  ADD PRIMARY KEY (`id_chatbot`),
  ADD KEY `fk_chatbot_usuario` (`id_usuario`);

--
-- Indices de la tabla `empresas`
--
ALTER TABLE `empresas`
  ADD PRIMARY KEY (`id_empresas`);

--
-- Indices de la tabla `postulaciones`
--
ALTER TABLE `postulaciones`
  ADD PRIMARY KEY (`id_postulacion`),
  ADD KEY `fk_postulacion_postulante` (`id_postulante`),
  ADD KEY `fk_postulacion_vacante` (`id_vacante`);

--
-- Indices de la tabla `postulantes`
--
ALTER TABLE `postulantes`
  ADD PRIMARY KEY (`id_postulante`),
  ADD KEY `fk_postulantes_usuario` (`id_usuario`);

--
-- Indices de la tabla `postulante_discapacidad`
--
ALTER TABLE `postulante_discapacidad`
  ADD PRIMARY KEY (`id_postulante`,`id_tipo_discapacidad`),
  ADD KEY `fk_pd_tipo` (`id_tipo_discapacidad`);

--
-- Indices de la tabla `reclutadores`
--
ALTER TABLE `reclutadores`
  ADD PRIMARY KEY (`id_reclutador`),
  ADD KEY `fk_reclutador_usuario` (`id_usuario`),
  ADD KEY `fk_reclutador_empresa` (`id_empresas`);

--
-- Indices de la tabla `reporte_vacante`
--
ALTER TABLE `reporte_vacante`
  ADD PRIMARY KEY (`id_reporte`),
  ADD KEY `fk_reporte_vacante` (`id_vacante`),
  ADD KEY `fk_reporte_usuario` (`id_usuario`);

--
-- Indices de la tabla `rol`
--
ALTER TABLE `rol`
  ADD PRIMARY KEY (`id_rol`);

--
-- Indices de la tabla `tipo_discapacidad`
--
ALTER TABLE `tipo_discapacidad`
  ADD PRIMARY KEY (`id_tipo_discapacidad`);

--
-- Indices de la tabla `tokens`
--
ALTER TABLE `tokens`
  ADD PRIMARY KEY (`id_token`),
  ADD KEY `fk_tokens_usuario` (`id_usuario`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id_usuario`),
  ADD UNIQUE KEY `correo` (`correo`),
  ADD KEY `fk_usuarios_rol` (`id_rol`);

--
-- Indices de la tabla `vacantes`
--
ALTER TABLE `vacantes`
  ADD PRIMARY KEY (`id_vacante`),
  ADD KEY `fk_vacante_reclutador` (`id_reclutador`);

--
-- Indices de la tabla `vacante_discapacidad`
--
ALTER TABLE `vacante_discapacidad`
  ADD PRIMARY KEY (`id_vacante`,`id_tipo_discapacidad`),
  ADD KEY `fk_vd_tipo` (`id_tipo_discapacidad`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `certificaciones`
--
ALTER TABLE `certificaciones`
  MODIFY `id_certificaciones` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `chabots`
--
ALTER TABLE `chabots`
  MODIFY `id_chatbot` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `empresas`
--
ALTER TABLE `empresas`
  MODIFY `id_empresas` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `postulaciones`
--
ALTER TABLE `postulaciones`
  MODIFY `id_postulacion` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `postulantes`
--
ALTER TABLE `postulantes`
  MODIFY `id_postulante` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `reclutadores`
--
ALTER TABLE `reclutadores`
  MODIFY `id_reclutador` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `reporte_vacante`
--
ALTER TABLE `reporte_vacante`
  MODIFY `id_reporte` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `rol`
--
ALTER TABLE `rol`
  MODIFY `id_rol` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `tipo_discapacidad`
--
ALTER TABLE `tipo_discapacidad`
  MODIFY `id_tipo_discapacidad` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `tokens`
--
ALTER TABLE `tokens`
  MODIFY `id_token` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `vacantes`
--
ALTER TABLE `vacantes`
  MODIFY `id_vacante` int(11) NOT NULL AUTO_INCREMENT;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `certificaciones`
--
ALTER TABLE `certificaciones`
  ADD CONSTRAINT `fk_cert_postulante` FOREIGN KEY (`id_postulante`) REFERENCES `postulantes` (`id_postulante`);

--
-- Filtros para la tabla `chabots`
--
ALTER TABLE `chabots`
  ADD CONSTRAINT `fk_chatbot_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `postulaciones`
--
ALTER TABLE `postulaciones`
  ADD CONSTRAINT `fk_postulacion_postulante` FOREIGN KEY (`id_postulante`) REFERENCES `postulantes` (`id_postulante`),
  ADD CONSTRAINT `fk_postulacion_vacante` FOREIGN KEY (`id_vacante`) REFERENCES `vacantes` (`id_vacante`);

--
-- Filtros para la tabla `postulantes`
--
ALTER TABLE `postulantes`
  ADD CONSTRAINT `fk_postulantes_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `postulante_discapacidad`
--
ALTER TABLE `postulante_discapacidad`
  ADD CONSTRAINT `fk_pd_postulante` FOREIGN KEY (`id_postulante`) REFERENCES `postulantes` (`id_postulante`),
  ADD CONSTRAINT `fk_pd_tipo` FOREIGN KEY (`id_tipo_discapacidad`) REFERENCES `tipo_discapacidad` (`id_tipo_discapacidad`);

--
-- Filtros para la tabla `reclutadores`
--
ALTER TABLE `reclutadores`
  ADD CONSTRAINT `fk_reclutador_empresa` FOREIGN KEY (`id_empresas`) REFERENCES `empresas` (`id_empresas`),
  ADD CONSTRAINT `fk_reclutador_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `reporte_vacante`
--
ALTER TABLE `reporte_vacante`
  ADD CONSTRAINT `fk_reporte_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`),
  ADD CONSTRAINT `fk_reporte_vacante` FOREIGN KEY (`id_vacante`) REFERENCES `vacantes` (`id_vacante`);

--
-- Filtros para la tabla `tokens`
--
ALTER TABLE `tokens`
  ADD CONSTRAINT `fk_tokens_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `fk_usuarios_rol` FOREIGN KEY (`id_rol`) REFERENCES `rol` (`id_rol`);

--
-- Filtros para la tabla `vacantes`
--
ALTER TABLE `vacantes`
  ADD CONSTRAINT `fk_vacante_reclutador` FOREIGN KEY (`id_reclutador`) REFERENCES `reclutadores` (`id_reclutador`);

--
-- Filtros para la tabla `vacante_discapacidad`
--
ALTER TABLE `vacante_discapacidad`
  ADD CONSTRAINT `fk_vd_tipo` FOREIGN KEY (`id_tipo_discapacidad`) REFERENCES `tipo_discapacidad` (`id_tipo_discapacidad`),
  ADD CONSTRAINT `fk_vd_vacante` FOREIGN KEY (`id_vacante`) REFERENCES `vacantes` (`id_vacante`);
COMMIT;

-- Modificaciones documentadas en origen (documentacion.txt): necesarias para registro/Google y archivos.
ALTER TABLE `postulantes` MODIFY `cv` LONGBLOB;
ALTER TABLE `certificaciones` MODIFY `pdf` LONGBLOB;
ALTER TABLE `reclutadores` MODIFY `id_empresas` INT NULL;
ALTER TABLE `tokens` MODIFY COLUMN `id_usuario` int(11) NULL;
-- Nota: `usuarios.foto_perfil` se mantiene varchar(500) porque Google guarda URL; el ALTER a LONGBLOB de origen se deja para Phase 2 junto a la decision de blob unico.

-- Feature 23 (empresa del reclutador): rfc real + duplicados garantizados por la BD.
-- Antes de los índices, las cadenas vacías de correo/teléfono pasan a NULL (el código nunca guarda '').
UPDATE `empresas` SET `correo_empresa` = NULL WHERE `correo_empresa` = '';
UPDATE `empresas` SET `telefono_empresa` = NULL WHERE `telefono_empresa` = '';
ALTER TABLE `empresas` ADD COLUMN `rfc` VARCHAR(13) NULL AFTER `sitio_web`, ADD UNIQUE KEY `uq_empresas_rfc` (`rfc`);
ALTER TABLE `empresas` ADD UNIQUE KEY `uq_empresas_nombre` (`nombre_empresas`);
ALTER TABLE `empresas` ADD UNIQUE KEY `uq_empresas_correo` (`correo_empresa`);
ALTER TABLE `empresas` ADD COLUMN `telefono_nacional` VARCHAR(10) GENERATED ALWAYS AS (RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(`telefono_empresa`,' ',''),'-',''),'(',''),')',''),'+',''),10)) STORED, ADD UNIQUE KEY `uq_empresas_telefono` (`telefono_nacional`);

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
