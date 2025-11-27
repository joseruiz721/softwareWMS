# Migración de contraseñas (password -> contrasena)

Este repositorio tuvo una inconsistencia en el nombre de la columna de contraseñas en la tabla `usuarios`:
- Algunos scripts usaban `password` (en inglés)
- El código del servidor usa `contrasena` (en español)

Para solucionar esto se hicieron los siguientes cambios:

- Unificamos la columna en los scripts y esquema a `contrasena`.
- Añadimos `sync-password-columns.js` que copia valores desde `password` a `contrasena` si existen (no elimina `password`).

Cómo ejecutar la migración

1) En Railway (recomendado, ejecuta el comando en la CLI del proyecto):

```powershell
railway run node sync-password-columns.js
```

2) Localmente (si tienes una base de datos y las variables de entorno):

```powershell
# Asegúrate de tener DATABASE_URL o variables DB_* configuradas.
node sync-password-columns.js
```

Notas de seguridad
- El script no elimina automáticamente la columna `password` para no destruir datos por accidente.
- Revisa las filas actualizadas y valida en un ambiente de pruebas antes de limpiar columnas antiguas.

Arreglo adicional
- `update-password.js` ahora actualiza la columna `contrasena` (antes actualizaba `password`).

Si necesitas ayuda ejecutando la migración en Railway o verificando que el login funcione después, dime y lo hago contigo.
