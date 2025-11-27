-- Esquema de Base de Datos Convertido para PostgreSQL

BEGIN;

-- Tabla de Auditoría
CREATE TABLE "auditoria" (
  "id" SERIAL PRIMARY KEY,
  "tabla_afectada" VARCHAR(255) NOT NULL,
  "accion" VARCHAR(10) NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
  "registro_id" INTEGER NOT NULL,
  "usuario_id" INTEGER NOT NULL,
  "fecha" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "detalles" TEXT
);

-- Tabla de Usuarios
CREATE TABLE "usuarios" (
  "id" SERIAL PRIMARY KEY,
  "cedula" VARCHAR(255) NOT NULL,
  "nombre" VARCHAR(255) NOT NULL,
  "correo" VARCHAR(255) NOT NULL UNIQUE,
  "contrasena" VARCHAR(255) NOT NULL
);

-- Tabla de Roles
CREATE TABLE "roles" (
  "id" SERIAL PRIMARY KEY,
  "nombre" VARCHAR(255) NOT NULL
);

-- Tabla de Dispositivos
CREATE TABLE "dispositivos" (
  "id" SERIAL PRIMARY KEY,
  "tipo" VARCHAR(255) NOT NULL,
  "marca" VARCHAR(255) NOT NULL,
  "modelo" VARCHAR(255) NOT NULL,
  "direccion_ip" VARCHAR(255),
  "puerto" VARCHAR(255),
  "usuario" VARCHAR(255),
  "contrasena" VARCHAR(255),
  "ubicacion" VARCHAR(255) NOT NULL,
  "usuario_id" INTEGER NOT NULL,
  CONSTRAINT "fk_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Crear índices para optimizar búsquedas en dispositivos
CREATE INDEX "idx_dispositivos_tipo_marca" ON "dispositivos"("tipo", "marca");
CREATE UNIQUE INDEX "idx_dispositivos_direccion_ip" ON "dispositivos"("direccion_ip");


-- Tabla de Servicios
CREATE TABLE "servicios" (
  "id" SERIAL PRIMARY KEY,
  "nombre" VARCHAR(100) NOT NULL,
  "descripcion" TEXT NOT NULL,
  "estado" VARCHAR(10) DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Inactivo')),
  "fecha_registro" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Usuario-Roles (Relación muchos a muchos)
CREATE TABLE "usuario_roles" (
  "usuario_id" INTEGER NOT NULL,
  "rol_id" INTEGER NOT NULL,
  PRIMARY KEY ("usuario_id", "rol_id"),
  CONSTRAINT "fk_usuario_roles_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_usuario_roles_rol" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE CASCADE
);


-- Volcado de datos para la tabla `usuarios`
INSERT INTO "usuarios" ("id", "cedula", "nombre", "correo", "contrasena") VALUES
(1, '80250899', 'jose raul ruiz real', 'joseraulruizreal@gmail.com', '$2b$10$w28hy1jr7zOGXlMwB1/QaurHomJ8b20DlHlzM9NniN0odQr.mb4em'),
(2, '1010101010', 'Camilo Garcia', 'camilo@gmail.com', '$2b$10$2WVfaLLrv5bmwR.SohaaaexgyQPkIN3kyykw1bUuVWrwPmKHYuDOC'),
(3, '6666666', 'maria cardona', 'maria@gmail.com', '$2b$10$rQJBwpAD9lWUV/eZq9p/W.t23j1f3PtwcIqjPna83hz3sDvAOKqzy');

-- Volcado de datos para la tabla `dispositivos`
INSERT INTO "dispositivos" ("id", "tipo", "marca", "modelo", "direccion_ip", "puerto", "usuario", "contrasena", "ubicacion", "usuario_id") VALUES
(1, 'camara analoga', 'dahua', 'ds252525', '10.10.5.5', '8080', 'jose raul', '1202', 'OFICINA', 1),
(2, 'Camara Analoga', 'hikvision', 'dc525356', '10.10.5.20', '8080', '', '', 'habitacion', 1),
(3, 'NVR', 'hikvision', 'dc606060', '10.10.5.30', '8080', '', '', 'sala', 1),
(4, 'Camara Analoga', 'dahua', 'dc525412', '10.10.5.60', '8080', '', '', 'casa', 1),
(5, 'Camara Analoga', 'hikvision', 'ds25252525', '10.10.5.40', '8080', '', '', 'ingreso', 1),
(6, 'Alarma', 'dahua', 'decf14141414', '10.10.5.24', '8081', '', '', 'patio', 1),
(7, 'Sensor de Movimiento', 'hikvision', 'dchrjejfff', '', '', '', '', 'entrada', 1),
(8, 'Camara IP', 'hikvision', 'ds525452545', '10.10.5.75', '8080', 'jose', '', 'casa', 1),
(9, 'NVR', 'hikvision', 'ds525452540', '10.10.5.80', '8081', 'jose', '', 'cosina', 1),
(10, 'Alarma', 'hikvision', 'ds525452548', '10.10.5.73', '8081', 'jose', '1202', 'jardin', 1),
(11, 'Camara Analoga', 'hikvision', 'ds52525452', '10.10.5.62', '8081', 'jose', '', 'casa', 1),
(12, 'Camara IP', 'dahua', 'ds525452550', '10.10.5.38', '8081', 'jose', '', 'casa', 1),
(13, 'Camara IP', 'dahua', 'ds525452551', '10.10.5.41', '8081', 'jose', '', 'casa', 1);

-- Volcado de datos para la tabla `servicios`
INSERT INTO "servicios" ("id", "nombre", "descripcion", "estado", "fecha_registro") VALUES
(1, 'Sistema de Alarmas', 'todo el servicio', 'Activo', '2025-02-25 04:59:06'),
(2, 'Sistema de Alarmas', 'toda la casa', 'Activo', '2025-03-14 15:38:19'),
(3, 'Sistema de Sensores', 'Sensores en la empresa', 'Activo', '2025-03-19 14:00:39');

-- Reiniciar las secuencias de los IDs para que los nuevos registros no choquen con los existentes
-- SELECT setval(pg_get_serial_sequence('usuarios', 'id'), COALESCE(max(id), 1), max(id) IS NOT null) FROM usuarios;
-- SELECT setval(pg_get_serial_sequence('dispositivos', 'id'), COALESCE(max(id), 1), max(id) IS NOT null) FROM dispositivos;
-- SELECT setval(pg_get_serial_sequence('servicios', 'id'), COALESCE(max(id), 1), max(id) IS NOT null) FROM servicios;


COMMIT;