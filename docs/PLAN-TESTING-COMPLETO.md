# 🧪 Plan de Testing Completo - Annalogica

**Objetivo:** Probar exhaustivamente toda la aplicación para garantizar que funciona perfectamente.

**Fecha:** 2025-11-16
**Estado:** En ejecución

---

## 📋 Índice

1. [Pre-requisitos](#pre-requisitos)
2. [Testing de Configuración](#testing-de-configuración)
3. [Testing Funcional](#testing-funcional)
4. [Testing de Integración](#testing-de-integración)
5. [Testing de Errores](#testing-de-errores)
6. [Testing de Performance](#testing-de-performance)
7. [Testing de Seguridad](#testing-de-seguridad)
8. [Checklist Final](#checklist-final)

---

## 🎬 Pre-requisitos

### Entornos a Probar

- [ ] **Local** (http://localhost:3000)
- [ ] **Producción** (https://annalogica.eu)

### Herramientas Necesarias

```bash
# Instalar herramientas de testing
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom

# Instalar herramientas de debugging
npm install --save-dev @vercel/analytics
```

### Cuentas de Prueba

Crear 3 usuarios de test:
- [ ] `test-free@annalogica.eu` (Plan Free)
- [ ] `test-pro@annalogica.eu` (Plan Pro - si está implementado)
- [ ] `test-admin@annalogica.eu` (Admin)

---

## 1️⃣ Testing de Configuración

### 1.1 Variables de Entorno

**Script de verificación:**

```bash
# Crear script
cat > scripts/check-config.js << 'EOF'
const requiredEnvVars = {
  critical: [
    'POSTGRES_URL',
    'BLOB_READ_WRITE_TOKEN',
    'JWT_SECRET',
    'OPENAI_API_KEY',
    'INNGEST_EVENT_KEY',
    'INNGEST_SIGNING_KEY'
  ],
  important: [
    'CRON_SECRET',
    'NEXT_PUBLIC_BASE_URL'
  ],
  optional: [
    'STRIPE_SECRET_KEY',
    'RESEND_API_KEY',
    'UPSTASH_REDIS_REST_URL'
  ]
};

console.log('🔍 Verificando configuración...\n');

let hasErrors = false;

requiredEnvVars.critical.forEach(varName => {
  if (!process.env[varName]) {
    console.log(`❌ ${varName}: NO CONFIGURADA`);
    hasErrors = true;
  } else {
    console.log(`✅ ${varName}: Configurada`);
  }
});

if (hasErrors) {
  console.log('\n❌ Errores críticos encontrados');
  process.exit(1);
} else {
  console.log('\n✅ Configuración OK');
  process.exit(0);
}
EOF

# Ejecutar
node scripts/check-config.js
```

**Checklist:**
- [ ] Todas las variables críticas configuradas
- [ ] `.env.local` existe en local
- [ ] Variables en Vercel configuradas para Production/Preview/Development

### 1.2 Conexiones Externas

```bash
# Test 1: PostgreSQL
curl https://annalogica.eu/api/health

# Debe devolver:
# {"status":"healthy","checks":{"server":"ok","database":"ok","env":"ok"}}
```

**Checklist:**
- [ ] Database conecta correctamente
- [ ] Vercel Blob accesible
- [ ] OpenAI API key válida
- [ ] Inngest configurado

### 1.3 Dependencias

```bash
# Verificar dependencias instaladas
npm list --depth=0

# Verificar versiones críticas
npm list next @vercel/blob @vercel/postgres openai inngest
```

**Checklist:**
- [ ] Next.js 15.5.4
- [ ] React 19.1.0
- [ ] @vercel/blob ^2.0.0
- [ ] openai ^4.51.0
- [ ] Sin vulnerabilidades críticas: `npm audit`

---

## 2️⃣ Testing Funcional

### 2.1 Autenticación

#### Test 1: Registro de Usuario

**Pasos:**
1. Abrir https://annalogica.eu/register (o localhost:3000/register)
2. Completar formulario:
   - Email: `test-{timestamp}@test.com`
   - Password: `Test123456!`
   - Nombre: `Usuario Test`
3. Submit

**Resultado esperado:**
- [ ] ✅ Registro exitoso
- [ ] ✅ Cookie `auth-token` establecida (verificar en DevTools → Application → Cookies)
- [ ] ✅ Redirección a dashboard `/`
- [ ] ✅ Mensaje de bienvenida
- [ ] ✅ Usuario creado en BD (verificar en Neon console)

**Problemas comunes:**
- ❌ Error 500: JWT_SECRET no configurado
- ❌ Error 400: Validación de password falla
- ❌ Cookie no se establece: Problema CORS o dominio

#### Test 2: Login

**Pasos:**
1. Logout (si estás logueado)
2. Ir a `/login`
3. Ingresar credenciales del Test 1
4. Submit

**Resultado esperado:**
- [ ] ✅ Login exitoso
- [ ] ✅ Cookie establecida
- [ ] ✅ Redirección a dashboard
- [ ] ✅ Datos de usuario correctos en UI

#### Test 3: Protección de Rutas

**Pasos:**
1. Logout
2. Intentar acceder a `/` (dashboard)

**Resultado esperado:**
- [ ] ✅ Redirección a `/login`
- [ ] ⚠️ O mensaje "No autenticado"

#### Test 4: Logout

**Pasos:**
1. Estando logueado, hacer click en Logout

**Resultado esperado:**
- [ ] ✅ Cookie eliminada
- [ ] ✅ Redirección a `/login`
- [ ] ✅ No puede acceder a rutas protegidas

---

### 2.2 Upload de Archivos

#### Test 1: Upload Audio Pequeño (<25 MB)

**Archivo de prueba:**
- Crear audio de prueba: https://www.soundjay.com/nature-sounds-1.html
- O usar: `test-audio-5min.mp3` (~5 MB)

**Pasos:**
1. Login como usuario test
2. Ir al dashboard
3. Arrastrar archivo o usar selector
4. Esperar upload

**Resultado esperado:**
- [ ] ✅ Progress bar aparece
- [ ] ✅ Upload completa 100%
- [ ] ✅ Archivo aparece en Vercel Blob (verificar en dashboard de Vercel)
- [ ] ✅ Job creado en BD con estado `pending`
- [ ] ✅ UI muestra archivo en lista

**Problemas comunes:**
- ❌ Error 401: No autenticado (cookie no enviada)
- ❌ Error 400 "Failed to retrieve client token": BLOB_READ_WRITE_TOKEN no configurado
- ❌ Upload se queda en 99%: Problema de red

#### Test 2: Upload Video Pequeño (<200 MB)

**Archivo de prueba:**
- Video corto MP4 (~50 MB, 2-3 minutos)

**Pasos:** Igual que Test 1

**Resultado esperado:** Mismo que Test 1

#### Test 3: Upload Archivo Grande (>200 MB)

**Pasos:**
1. Intentar subir video >200 MB

**Resultado esperado:**
- [ ] ✅ Error antes de subir: "Archivo demasiado grande"
- [ ] ✅ O modal de "Video grande detectado" (si implementaste la solución)
- [ ] ⚠️ No debe subir el archivo completo

#### Test 4: Upload Tipo Inválido

**Pasos:**
1. Intentar subir imagen JPG o archivo ZIP

**Resultado esperado:**
- [ ] ✅ Error: "Tipo de archivo no permitido"
- [ ] ✅ Lista de tipos permitidos mostrada

---

### 2.3 Procesamiento de Transcripción

#### Test 1: Transcripción Completa (Audio)

**Archivo:** Audio de 2-5 minutos en español

**Pasos:**
1. Subir audio
2. Esperar a que inicie procesamiento
3. Observar progreso
4. Esperar hasta completar

**Resultado esperado:**
- [ ] ✅ Estado cambia: `pending` → `processing` → `completed`
- [ ] ✅ Progress bar actualiza (10% → 50% → 90% → 100%)
- [ ] ✅ Tiempo estimado razonable (~2-5 minutos para 5 min de audio)
- [ ] ✅ Al completar, aparecen archivos generados:
  - [ ] Transcripción (TXT)
  - [ ] Subtítulos SRT
  - [ ] Subtítulos VTT
  - [ ] Resumen
  - [ ] Speakers (si hay múltiples hablantes)

**Verificar en Vercel Blob:**
```
Archivos esperados:
- transcription-{jobId}.txt
- subtitles-{jobId}.srt
- subtitles-{jobId}.vtt
- summary-{jobId}.txt
- speakers-{jobId}.txt (si aplica)
```

**Verificar en BD:**
```sql
SELECT
  id,
  status,
  filename,
  txt_url,
  srt_url,
  vtt_url,
  summary_url,
  created_at,
  completed_at
FROM transcription_jobs
WHERE id = '{jobId}';
```

**Resultado esperado:**
- [ ] ✅ Todas las URLs pobladas
- [ ] ✅ Status = 'completed'
- [ ] ✅ completed_at tiene timestamp

**Problemas comunes:**
- ❌ Se queda en `pending`: Inngest no está configurado
- ❌ Status `failed`: Revisar logs de Inngest
- ❌ Audio no transcribe: OPENAI_API_KEY inválida
- ❌ Error en summary: Problema con Claude API

#### Test 2: Transcripción con Idioma Específico

**Pasos:**
1. Subir audio en catalán
2. Seleccionar idioma: **Catalán** (no auto)
3. Procesar

**Resultado esperado:**
- [ ] ✅ Transcripción en catalán (no traducida al español)
- [ ] ✅ Metadata muestra `language: 'ca'`

**Verificar Fix del Bug:**
Este era el bug crítico que arreglaste recientemente.
- [ ] ✅ NO debe transcribir en español si elegiste catalán
- [ ] ✅ Auto-detección funciona correctamente

#### Test 3: Transcripción con Speakers

**Archivo:** Audio con 2-3 personas hablando

**Resultado esperado:**
- [ ] ✅ Archivo `speakers-{jobId}.txt` generado
- [ ] ✅ Speakers identificados (Speaker 1, Speaker 2, etc.)
- [ ] ✅ Timestamps de cada intervención

#### Test 4: Procesamiento con Error (Forzado)

**Pasos:**
1. Temporalmente, deshabilitar OPENAI_API_KEY en Vercel
2. Subir archivo
3. Esperar procesamiento

**Resultado esperado:**
- [ ] ✅ Status cambia a `failed`
- [ ] ✅ Error message guardado en BD
- [ ] ✅ UI muestra error claro al usuario
- [ ] ✅ No crash de la app

**Restaurar:** Volver a habilitar OPENAI_API_KEY

---

### 2.4 Descargas

#### Test 1: Descarga Individual

**Pasos:**
1. Con transcripción completa, click en "Descargar TXT"

**Resultado esperado:**
- [ ] ✅ Archivo descarga correctamente
- [ ] ✅ Nombre de archivo descriptivo: `transcription-{filename}.txt`
- [ ] ✅ Contenido correcto (texto transcrito)

#### Test 2: Descarga de Todos los Archivos

**Pasos:**
1. Click en "Descargar Todo" o "Descargar ZIP"

**Resultado esperado:**
- [ ] ✅ Descarga ZIP con todos los archivos
- [ ] ✅ ZIP contiene: TXT, SRT, VTT, Summary, Speakers
- [ ] ✅ Nombres de archivos organizados

#### Test 3: Exportación a Excel (si implementado)

**Pasos:**
1. Click en "Exportar a Excel"

**Resultado esperado:**
- [ ] ✅ Descarga archivo .xlsx
- [ ] ✅ Contiene datos estructurados
- [ ] ✅ Formato legible

---

### 2.5 Dashboard y Listado

#### Test 1: Listado de Archivos

**Pasos:**
1. Con varios archivos procesados, ver dashboard

**Resultado esperado:**
- [ ] ✅ Todos los archivos aparecen
- [ ] ✅ Ordenados por fecha (más recientes primero)
- [ ] ✅ Estado correcto (pending/processing/completed/failed)
- [ ] ✅ Iconos de tipo de archivo correctos

#### Test 2: Búsqueda/Filtrado

**Pasos:**
1. Buscar por nombre de archivo

**Resultado esperado:**
- [ ] ✅ Resultados filtrados correctamente
- [ ] ✅ Búsqueda case-insensitive

#### Test 3: Paginación (si tienes >10 archivos)

**Resultado esperado:**
- [ ] ✅ Muestra máximo 10-20 archivos por página
- [ ] ✅ Botones siguiente/anterior funcionan
- [ ] ✅ Performance buena incluso con 100+ archivos

---

### 2.6 Configuración de Usuario

#### Test 1: Cambio de Idioma

**Pasos:**
1. Ir a configuración (si existe `/settings`)
2. Cambiar idioma preferido

**Resultado esperado:**
- [ ] ✅ Idioma guardado en BD
- [ ] ✅ UI actualiza inmediatamente
- [ ] ✅ Persiste después de logout/login

#### Test 2: Cambio de Tema (Dark/Light)

**Pasos:**
1. Toggle dark mode

**Resultado esperado:**
- [ ] ✅ UI cambia inmediatamente
- [ ] ✅ Preferencia guardada en localStorage
- [ ] ✅ Persiste al recargar página

---

## 3️⃣ Testing de Integración

### 3.1 Flujo Completo de Usuario Nuevo

**Pasos:**
1. Abrir en modo incógnito
2. Ir a https://annalogica.eu
3. Click "Registrarse"
4. Completar formulario
5. Verificar email (si implementado)
6. Login
7. Subir primer archivo
8. Esperar procesamiento
9. Descargar resultados
10. Logout

**Resultado esperado:**
- [ ] ✅ Todo el flujo funciona sin errores
- [ ] ✅ No hay pasos bloqueantes
- [ ] ✅ UX es clara en cada paso
- [ ] ✅ Mensajes de ayuda apropiados

### 3.2 Flujo de Múltiples Archivos

**Pasos:**
1. Subir 5 archivos simultáneamente
2. Observar procesamiento

**Resultado esperado:**
- [ ] ✅ Todos se suben correctamente
- [ ] ✅ Procesamiento concurrente (no se bloquean entre sí)
- [ ] ✅ Progress individual para cada archivo
- [ ] ✅ No hay race conditions

### 3.3 Flujo de Admin (si implementado)

**Pasos:**
1. Login como admin
2. Acceder a `/admin`
3. Ver estadísticas
4. Gestionar usuarios

**Resultado esperado:**
- [ ] ✅ Dashboard admin accesible
- [ ] ✅ Solo admin puede acceder (verificar con usuario normal)
- [ ] ✅ Estadísticas correctas
- [ ] ✅ Acciones admin funcionan

---

## 4️⃣ Testing de Errores

### 4.1 Manejo de Errores de Red

#### Test 1: Upload con Conexión Lenta

**Pasos:**
1. En DevTools → Network, throttle a "Slow 3G"
2. Subir archivo

**Resultado esperado:**
- [ ] ✅ Progress bar refleja velocidad lenta
- [ ] ✅ No timeout prematuro
- [ ] ✅ Eventualmente completa

#### Test 2: Upload con Pérdida de Conexión

**Pasos:**
1. Iniciar upload
2. A mitad, deshabilitar WiFi/Ethernet
3. Reconectar después de 10 segundos

**Resultado esperado:**
- [ ] ✅ Mensaje de error claro
- [ ] ⚠️ O reintento automático (si implementado)
- [ ] ✅ No crash de la app

### 4.2 Manejo de Errores de API

#### Test 1: API Key Inválida

**Pasos:**
1. Temporalmente, cambiar OPENAI_API_KEY a valor inválido
2. Subir y procesar archivo

**Resultado esperado:**
- [ ] ✅ Error capturado y logueado
- [ ] ✅ Status = 'failed'
- [ ] ✅ Mensaje de error mostrado al usuario
- [ ] ✅ No expone API key en mensaje de error

#### Test 2: Servicio Externo Caído

**Pasos:**
1. Simular que Inngest no responde (difícil, pero puede pasar)

**Resultado esperado:**
- [ ] ✅ Retry automático configurado (Inngest retry policy)
- [ ] ✅ Timeout después de N intentos
- [ ] ✅ Usuario notificado del error

### 4.3 Manejo de Errores de Base de Datos

#### Test 1: BD Desconectada

**Pasos:**
1. Temporalmente, cambiar POSTGRES_URL a inválida
2. Intentar login

**Resultado esperado:**
- [ ] ✅ Error 500 o 503
- [ ] ✅ Mensaje genérico (no expone detalles de BD)
- [ ] ✅ Logged en servidor

#### Test 2: Query Timeout

**Pasos:**
1. Simular query muy lenta (difícil de forzar)

**Resultado esperado:**
- [ ] ✅ Timeout después de tiempo razonable
- [ ] ✅ No bloquea toda la app

---

## 5️⃣ Testing de Performance

### 5.1 Tiempo de Carga de Página

```bash
# Usar Lighthouse
npm install -g lighthouse

# Test homepage
lighthouse https://annalogica.eu --view

# Test dashboard (necesita auth)
# Manual: DevTools → Lighthouse → Run
```

**Métricas objetivo:**
- [ ] ✅ First Contentful Paint (FCP): <1.8s
- [ ] ✅ Largest Contentful Paint (LCP): <2.5s
- [ ] ✅ Time to Interactive (TTI): <3.8s
- [ ] ✅ Cumulative Layout Shift (CLS): <0.1
- [ ] ✅ Performance Score: >90

### 5.2 Bundle Size

```bash
# Analizar bundle
npm run build

# Ver reporte
du -sh .next/static/chunks/*.js | sort -h
```

**Verificar:**
- [ ] ✅ Bundle total <500 KB (gzipped)
- [ ] ✅ No hay dependencias masivas innecesarias
- [ ] ✅ Code splitting funciona

### 5.3 Performance de Upload

**Test con diferentes tamaños:**
- [ ] 10 MB: <30 segundos
- [ ] 50 MB: <2 minutos
- [ ] 100 MB: <5 minutos
- [ ] 200 MB: <10 minutos

### 5.4 Performance de Procesamiento

**Tiempo total (upload + transcripción + generación):**
- [ ] 5 min audio: <5 minutos total
- [ ] 15 min audio: <10 minutos total
- [ ] 30 min audio: <15 minutos total

---

## 6️⃣ Testing de Seguridad

### 6.1 Autenticación

#### Test 1: JWT Token Security

**Pasos:**
1. Login
2. Copiar cookie `auth-token` desde DevTools
3. Decodificar en https://jwt.io

**Verificar:**
- [ ] ✅ Cookie tiene flag `HttpOnly` (no accesible vía JavaScript)
- [ ] ✅ Cookie tiene flag `Secure` en producción
- [ ] ✅ SameSite = 'lax' o 'strict'
- [ ] ✅ Token expira en tiempo razonable (7 días)
- [ ] ✅ Payload no contiene información sensible

#### Test 2: SQL Injection

**Pasos:**
1. Intentar login con:
   - Email: `admin' OR '1'='1`
   - Password: `anything`

**Resultado esperado:**
- [ ] ✅ Login falla (no bypasses)
- [ ] ✅ No error de BD expuesto

#### Test 3: XSS (Cross-Site Scripting)

**Pasos:**
1. Subir archivo con nombre malicioso:
   - `<script>alert('XSS')</script>.mp3`

**Resultado esperado:**
- [ ] ✅ Nombre sanitizado o escapado en UI
- [ ] ✅ No ejecuta JavaScript

### 6.2 Autorización

#### Test 1: Acceso a Archivos de Otros Usuarios

**Pasos:**
1. Login como `user1@test.com`
2. Subir archivo, obtener jobId
3. Logout
4. Login como `user2@test.com`
5. Intentar acceder a `/api/jobs/{jobId}` de user1

**Resultado esperado:**
- [ ] ✅ Error 403 Forbidden o 404 Not Found
- [ ] ✅ No puede ver/descargar archivos de otro usuario

#### Test 2: Endpoints Admin sin Auth

**Pasos:**
1. Sin login, intentar `GET /api/admin/stats`

**Resultado esperado:**
- [ ] ✅ Error 401 Unauthorized

### 6.3 Rate Limiting

**Pasos:**
1. Intentar 10 logins fallidos consecutivos

**Resultado esperado:**
- [ ] ✅ Después de 5 intentos, bloqueo temporal
- [ ] ✅ Mensaje: "Demasiados intentos, espera X minutos"

---

## 7️⃣ Testing Multi-Browser

### 7.1 Browsers Desktop

Probar en:
- [ ] Chrome (última versión)
- [ ] Firefox (última versión)
- [ ] Safari (si tienes Mac)
- [ ] Edge (última versión)

**Funcionalidades críticas:**
- [ ] Login/Logout
- [ ] Upload de archivos
- [ ] Visualización de resultados
- [ ] Descargas

### 7.2 Browsers Mobile

Probar en:
- [ ] Chrome Mobile (Android)
- [ ] Safari Mobile (iOS)

**Funcionalidades críticas:**
- [ ] Responsive design funciona
- [ ] Upload desde galería
- [ ] Touch gestures funcionan

---

## 8️⃣ Testing de Producción vs Local

### Diferencias a Verificar

| Aspecto | Local | Producción |
|---------|-------|------------|
| **URL** | localhost:3000 | annalogica.eu |
| **HTTPS** | No | ✅ Sí |
| **Cookies** | `Secure: false` | ✅ `Secure: true` |
| **Performance** | Más lento (dev mode) | Más rápido (optimizado) |
| **Hot Reload** | ✅ Sí | No |
| **Source Maps** | ✅ Sí | No (no expuestos) |

**Verificar que funciona en AMBOS entornos:**
- [ ] ✅ Autenticación
- [ ] ✅ Upload de archivos
- [ ] ✅ Procesamiento
- [ ] ✅ Descargas

---

## 📊 Checklist Final

### Pre-Launch (antes de considerar "listo")

#### Funcional
- [ ] ✅ Todos los tests funcionales pasan
- [ ] ✅ No hay bugs críticos conocidos
- [ ] ✅ Features principales funcionan en todos los browsers

#### Performance
- [ ] ✅ Lighthouse score >85
- [ ] ✅ Upload/processing en tiempos razonables
- [ ] ✅ No hay memory leaks evidentes

#### Seguridad
- [ ] ✅ Autenticación robusta
- [ ] ✅ Autorización funciona
- [ ] ✅ No hay vulnerabilidades conocidas: `npm audit`

#### Configuración
- [ ] ✅ Todas las variables de entorno configuradas en Vercel
- [ ] ✅ Backups de BD configurados
- [ ] ✅ Monitoring activo (logs, errores)

#### Documentación
- [ ] ✅ README actualizado
- [ ] ✅ Guía de usuario disponible
- [ ] ✅ Documentación técnica para mantenimiento

---

## 🐛 Registro de Bugs Encontrados

### Template para reportar bugs:

```markdown
## Bug: [Título descriptivo]

**Severidad:** Crítica / Alta / Media / Baja
**Entorno:** Local / Producción
**Browser:** Chrome 120 / Firefox 121 / etc.

**Pasos para reproducir:**
1.
2.
3.

**Resultado esperado:**


**Resultado actual:**


**Screenshots:** (si aplica)

**Logs/Errores:**
```

**Fix aplicado:**
```
Descripción del fix...
```

**Verificado:** ✅ / ❌

---

### Bugs Conocidos (Ejemplo)

#### Bug #1: Cookie no persiste en Safari

**Severidad:** Alta
**Entorno:** Producción
**Browser:** Safari 17

**Descripción:**
Cookie auth-token no se establece en Safari debido a SameSite policy.

**Fix:**
Cambiar SameSite de 'strict' a 'lax' en auth.ts

**Verificado:** ✅

---

## 📈 Métricas de Testing

### Coverage Objetivo

- [ ] Unit tests: >80% coverage
- [ ] Integration tests: Flujos críticos cubiertos
- [ ] E2E tests: Happy path + error cases

### Tiempo de Testing

**Estimado:**
- Testing manual: 4-6 horas
- Testing automatizado (setup + run): 2-3 horas
- Fixes de bugs encontrados: Variable (2-8 horas)

**Total:** 1-2 días para testing completo

---

## 🚀 Próximos Pasos

Después de completar este testing:

1. [ ] Documentar todos los bugs encontrados
2. [ ] Priorizar fixes (críticos primero)
3. [ ] Aplicar fixes uno por uno
4. [ ] Re-testear después de cada fix
5. [ ] Deploy a producción cuando todo esté verde
6. [ ] Monitoring post-deploy (primeras 24-48 horas)

---

**Última actualización:** 2025-11-16
**Estado:** Documento completo, listo para ejecutar
