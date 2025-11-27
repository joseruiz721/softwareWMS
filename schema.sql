-- schema.sql - Esquema completo para Sistema WMS Mizooco
-- Ejecutar este script en Railway PostgreSQL para crear todas las tablas

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    cedula VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP
);

-- Tabla para sesiones (requerida por connect-pg-simple)
CREATE TABLE IF NOT EXISTS session (
    sid VARCHAR PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

-- Tabla de ordenadores
CREATE TABLE IF NOT EXISTS ordenadores (
    id SERIAL PRIMARY KEY,
    ip VARCHAR(45),
    ubicacion VARCHAR(100),
    activo VARCHAR(50),
    serial VARCHAR(100) UNIQUE,
    estado VARCHAR(50),
    fecha_ingreso DATE,
    observaciones TEXT,
    id_usuario_responsable INTEGER REFERENCES usuarios(id),
    marca VARCHAR(100),
    activo_fijo VARCHAR(100)
);

-- Tabla de access point
CREATE TABLE IF NOT EXISTS access_point (
    id SERIAL PRIMARY KEY,
    ip VARCHAR(45),
    ubicacion VARCHAR(100),
    serial VARCHAR(100) UNIQUE,
    modelo VARCHAR(100),
    version VARCHAR(100),
    arquitectura VARCHAR(100),
    mac VARCHAR(100),
    estado VARCHAR(50),
    fecha_ingreso DATE,
    observacion TEXT,
    id_usuarios_responsable INTEGER REFERENCES usuarios(id),
    activo_fijo VARCHAR(100)
);

-- Tabla de readers
CREATE TABLE IF NOT EXISTS readers (
    id SERIAL PRIMARY KEY,
    ip VARCHAR(45),
    ubicacion VARCHAR(100),
    no_maquina VARCHAR(100),
    serial VARCHAR(100) UNIQUE,
    mac VARCHAR(100),
    estado VARCHAR(50),
    fecha_ingreso DATE,
    observaciones TEXT,
    id_usuario_responsable INTEGER REFERENCES usuarios(id),
    activo_fijo VARCHAR(100)
);

-- Tabla de etiquetadoras
CREATE TABLE IF NOT EXISTS etiquetadoras (
    id SERIAL PRIMARY KEY,
    ip VARCHAR(45),
    ubicacion VARCHAR(100),
    activo VARCHAR(50),
    serial VARCHAR(100) UNIQUE,
    modelo VARCHAR(100),
    serial_aplicador VARCHAR(100),
    mac VARCHAR(100),
    estado VARCHAR(50),
    fecha_ingreso DATE,
    observaciones TEXT,
    id_usuarios_responsable INTEGER REFERENCES usuarios(id),
    activo_fijo VARCHAR(100)
);

-- Tabla de tablets
CREATE TABLE IF NOT EXISTS tablets (
    id SERIAL PRIMARY KEY,
    ip VARCHAR(45),
    ubicacion VARCHAR(100),
    no_maquina VARCHAR(100),
    activo VARCHAR(50),
    serial VARCHAR(100) UNIQUE,
    estado VARCHAR(50),
    fecha_ingreso DATE,
    observaciones TEXT,
    id_usuario_responsable INTEGER REFERENCES usuarios(id),
    activo_fijo VARCHAR(100)
);

-- Tabla de lectores QR
CREATE TABLE IF NOT EXISTS lectores_qr (
    id SERIAL PRIMARY KEY,
    ubicacion VARCHAR(100),
    activo VARCHAR(50),
    modelo VARCHAR(100),
    estado VARCHAR(50),
    fecha_ingreso DATE,
    observaciones TEXT,
    id_usuarios_responsable INTEGER REFERENCES usuarios(id),
    activo_fijo VARCHAR(100)
);

-- Tabla de repuestos
CREATE TABLE IF NOT EXISTS repuestos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(50) UNIQUE,
    cantidad INTEGER DEFAULT 0,
    stock_minimo INTEGER DEFAULT 5,
    ubicacion VARCHAR(100),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de mantenimientos
CREATE TABLE IF NOT EXISTS mantenimientos (
    id SERIAL PRIMARY KEY,
    descripcion TEXT NOT NULL,
    tipo VARCHAR(50),
    estado VARCHAR(50),
    fecha DATE,
    id_usuarios INTEGER REFERENCES usuarios(id),
    id_dispositivo INTEGER,
    tipo_dispositivo VARCHAR(50),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar usuario administrador por defecto
-- Contraseña: 'password' (hasheada con bcrypt)
INSERT INTO usuarios (cedula, nombre, correo, password, role) 
VALUES (
    '12345678', 
    'Administrador Principal', 
    'joseraulruizreal@gmail.com', 
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
    'admin'
) ON CONFLICT (correo) DO NOTHING;

-- Insertar algunos repuestos de ejemplo
INSERT INTO repuestos (nombre, codigo, cantidad, stock_minimo, ubicacion) VALUES
('Memoria RAM 8GB DDR4', 'RAM-8GB-DDR4', 25, 5, 'Almacén A'),
('Disco SSD 500GB', 'SSD-500GB', 15, 3, 'Almacén B'),
('Teclado USB', 'TEC-USB', 30, 10, 'Almacén C'),
('Mouse Óptico', 'MS-OPT', 40, 15, 'Almacén A')
ON CONFLICT (codigo) DO NOTHING;

-- Crear índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_usuarios_correo ON usuarios(correo);
CREATE INDEX IF NOT EXISTS idx_usuarios_cedula ON usuarios(cedula);
CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);
CREATE INDEX IF NOT EXISTS idx_repuestos_codigo ON repuestos(codigo);
CREATE INDEX IF NOT EXISTS idx_mantenimientos_fecha ON mantenimientos(fecha);

-- Mensaje de confirmación
DO $$ 
BEGIN
    RAISE NOTICE '✅ Esquema de base de datos creado exitosamente';
    RAISE NOTICE '📊 Tablas creadas: usuarios, session, ordenadores, access_point, readers, etiquetadoras, tablets, lectores_qr, repuestos, mantenimientos';
    RAISE NOTICE '👤 Usuario administrador: joseraulruizreal@gmail.com / password';
END $$;