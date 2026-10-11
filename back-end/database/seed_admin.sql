-- Cuenta admin local (dev). Crea o repara el administrador.
--
-- Uso: correr en phpMyAdmin, pestana SQL, BD `inclusijob`.
-- Es idempotente: si el correo ya existe, actualiza hash, estado, validacion y rol.
-- Credenciales que deja: correo `admi@gmail.com`, password `Admin1234!`.
-- Cambiar la password tras el primer login. No correr en produccion.
--
INSERT INTO usuarios
  (nombres, apellidos, correo, `contraseña`, telefono, estado, correo_validado, id_rol)
VALUES
  ('Admin', 'Sistema', 'admi@gmail.com', '$2y$10$1B3w8APqImLhTuU02d05au3ui4zs6mzDMDOKiiD5WfnzvMKAlHOeS', NULL, 1, 1, 1)
ON DUPLICATE KEY UPDATE
  `contraseña` = VALUES(`contraseña`),
  estado = 1,
  correo_validado = 1,
  id_rol = 1;

-- Verificacion (metadatos, sin secretos)
SELECT id_usuario, correo, estado, correo_validado, id_rol
FROM usuarios WHERE correo = 'admi@gmail.com';
