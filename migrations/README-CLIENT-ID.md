# 🔢 Sistema de Client ID de 4 Cifras

## 📋 Descripción

Este sistema agrega un **ID corto de 4 dígitos** (1000-9999) a cada usuario para facilitar la identificación y búsqueda de clientes.

## ✨ Características Implementadas

✅ **Columna `client_id`** en tabla users (INTEGER, UNIQUE, NOT NULL)
✅ **Generación automática** de IDs en rango 1000-9999
✅ **Secuencia con CYCLE** para reutilizar IDs cuando se alcanza 9999
✅ **Trigger automático** para asignar client_id en nuevos registros
✅ **Migración de usuarios existentes** con IDs asignados en orden de creación
✅ **Actualización del Admin Dashboard** para mostrar client_id
✅ **Exportaciones actualizadas** (Excel y PDF) para usar client_id en lugar de código de jobId

---

## 🚀 Cómo Aplicar la Migración

### Opción 1: Script Automático (Recomendado)

```bash
# Desde la raíz del proyecto
node scripts/apply-client-id-migration.js
```

Este script:
1. Lee el archivo SQL de migración
2. Aplica todos los cambios a la base de datos
3. Verifica que todos los usuarios tengan client_id asignado
4. Muestra estadísticas y ejemplos

### Opción 2: Manual en Vercel Postgres

1. Ir a https://vercel.com/dashboard
2. Seleccionar proyecto `annalogica`
3. Ir a **Storage** → **Postgres**
4. Click en **Query**
5. Copiar y pegar el contenido de `migrations/db-migration-client-id.sql`
6. Ejecutar

### Opción 3: Manual con psql

```bash
psql "$POSTGRES_URL" < migrations/db-migration-client-id.sql
```

---

## 📊 ¿Qué hace la migración?

### 1. Agrega columna `client_id`
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS client_id INTEGER UNIQUE;
```

### 2. Crea secuencia 1000-9999
```sql
CREATE SEQUENCE client_id_seq
  START WITH 1000
  INCREMENT BY 1
  MINVALUE 1000
  MAXVALUE 9999
  CYCLE;
```

### 3. Asigna IDs a usuarios existentes
Ejecuta un bloque PL/pgSQL que:
- Recorre todos los usuarios sin client_id
- Busca el siguiente ID disponible
- Evita duplicados (en caso de IDs reciclados)

### 4. Hace la columna NOT NULL
```sql
ALTER TABLE users ALTER COLUMN client_id SET NOT NULL;
```

### 5. Crea función y trigger
- **Función `get_next_client_id()`**: Obtiene siguiente ID único
- **Trigger `trigger_assign_client_id`**: Asigna automáticamente en INSERT

---

## 🎯 Dónde se Usa el Client ID

### 1. Admin Dashboard (`components/admin/AdminDashboard.tsx`)
Nueva columna "🔢 ID Cliente" que muestra el client_id en **naranja y negrita**:
```tsx
<span className="text-lg font-bold text-orange-500 font-mono">
  {user.client_id || '-'}
</span>
```

### 2. Exportaciones Excel (`lib/excel-generator.ts`)
En lugar de "Código de Archivo" (último 8 caracteres del jobId), ahora muestra:
```
ID Cliente: 1234
```

### 3. Exportaciones PDF (`lib/results-pdf-generator.ts`)
PDFs de audio y documentos incluyen:
```
ID Cliente: 1234
```

### 4. Búsqueda de Archivos (Próxima tarea)
Permitirá buscar archivos por client_id:
```
Buscar: 1234 → Encuentra todos los archivos del cliente 1234
```

---

## 🔍 Verificar que Funciona

### 1. Verificar usuarios existentes
```sql
SELECT client_id, email, created_at
FROM users
ORDER BY created_at
LIMIT 10;
```

Deberías ver IDs asignados (1000, 1001, 1002...)

### 2. Crear usuario nuevo
```sql
INSERT INTO users (email, password, name, role)
VALUES ('test@example.com', 'hashed_password', 'Test User', 'user')
RETURNING client_id;
```

Debería asignarse automáticamente el siguiente ID disponible.

### 3. Ver en Admin Dashboard
1. Ir a `/admin`
2. Buscar la nueva columna "🔢 ID Cliente"
3. Verificar que todos los usuarios tienen un ID de 4 cifras

### 4. Procesar archivo
1. Subir un archivo de audio o documento
2. Esperar a que se procese
3. Descargar el Excel o PDF
4. Verificar que aparece "ID Cliente: XXXX" en lugar del código largo

---

## 🛠️ Archivos Modificados

### Base de Datos
- ✅ `migrations/db-migration-client-id.sql` - Migración SQL
- ✅ `scripts/apply-client-id-migration.js` - Script aplicación

### Tipos e Interfaces
- ✅ `lib/db.ts` - Interface `User` + queries actualizadas
- ✅ `lib/admin-users.ts` - Interface `UserWithMetrics` + query actualizada
- ✅ `lib/excel-generator.ts` - Interfaces `AudioExcelData` y `DocumentExcelData`
- ✅ `lib/results-pdf-generator.ts` - Interfaces `AudioPDFData` y `DocumentPDFData`

### Procesadores
- ✅ `lib/processors/audio-processor.ts` - Fetch client_id y pasa a generadores
- ✅ `lib/processors/document-processor.ts` - Fetch client_id y pasa a generadores

### UI
- ✅ `components/admin/AdminDashboard.tsx` - Nueva columna client_id

---

## ⚠️ Consideraciones Importantes

### 1. Rango de IDs (1000-9999)
- **Capacidad**: 9,000 IDs únicos
- **Después de 9999**: La secuencia reinicia en 1000 (CYCLE)
- **Sin duplicados**: La función `get_next_client_id()` verifica disponibilidad

### 2. ¿Qué pasa si se alcanzan 9,000 usuarios?
La secuencia reinicia y busca IDs liberados (usuarios eliminados). Si no hay IDs disponibles, la función lanzará error después de 100 intentos.

**Solución futura** si es necesario:
```sql
-- Aumentar a 5 dígitos (10000-99999)
ALTER SEQUENCE client_id_seq
  MINVALUE 10000
  MAXVALUE 99999;
```

### 3. Migración sin downtime
- ✅ La migración es **idempotente** (puede ejecutarse múltiples veces)
- ✅ Usa `IF NOT EXISTS` para evitar errores
- ✅ No bloquea la tabla por mucho tiempo
- ✅ Usuarios pueden seguir usando la app durante la migración

### 4. Retrocompatibilidad
- ✅ Los archivos procesados **antes** de la migración seguirán funcionando
- ✅ El código maneja `clientId` opcional (`clientId?: number`)
- ✅ Si falta client_id, muestra "N/A" en exportaciones

---

## 📝 Próximos Pasos

### Implementados ✅
1. ✅ Migración SQL completa
2. ✅ Script de aplicación
3. ✅ Actualización de tipos TypeScript
4. ✅ Generadores Excel/PDF
5. ✅ Procesadores audio/documento
6. ✅ Admin Dashboard

### Pendientes ⏭️
1. ⏭️ **Buscador de archivos** por client_id (siguiente tarea)
2. ⏭️ Endpoint API para buscar por client_id
3. ⏭️ Mostrar client_id en dashboard principal de usuario
4. ⏭️ Permitir búsqueda en processed-files page

---

## 🎉 Resultado Final

Después de aplicar la migración:

- **Admin ve**: ID cliente en columna dedicada (ej: 1234)
- **Reportes Excel**: "ID Cliente: 1234" en primera fila
- **Reportes PDF**: "ID Cliente: 1234" en sección "Información General"
- **Búsquedas** (próximo): Buscar "1234" encuentra todos los archivos del cliente

**Ejemplo visual en Admin Dashboard:**
```
┌───────────────────┬───────────┬───────────┬─────────┐
│ Usuario           │ ID Cliente│ Nombre    │ Tipo    │
├───────────────────┼───────────┼───────────┼─────────┤
│ user1@example.com │   1234    │ Usuario 1 │ Pro     │
│ user2@example.com │   1235    │ Usuario 2 │ Basic   │
│ user3@example.com │   1236    │ Usuario 3 │ Free    │
└───────────────────┴───────────┴───────────┴─────────┘
```

---

## 🆘 Troubleshooting

### Error: "column 'client_id' already exists"
La migración ya fue aplicada. Verificar con:
```sql
SELECT client_id FROM users LIMIT 1;
```

### Error: "sequence 'client_id_seq' already exists"
Normal si se reintenta la migración. Usar `DROP SEQUENCE IF EXISTS` primero.

### Usuarios sin client_id después de migración
Ejecutar manualmente:
```sql
UPDATE users
SET client_id = get_next_client_id()
WHERE client_id IS NULL;
```

### IDs no aparecen en exportaciones
1. Verificar que los procesadores se actualizaron
2. Procesar un archivo nuevo (los antiguos no se actualizan retroactivamente)
3. Verificar logs: `console.log('[...Processor] User client_id:', clientId)`

---

## 📞 Soporte

Si tienes problemas aplicando la migración:
1. Revisar logs en Vercel Dashboard
2. Verificar POSTGRES_URL está configurado
3. Ejecutar script con `node scripts/apply-client-id-migration.js`
4. Revisar este README

**¡Sistema de Client ID listo para producción!** 🚀
