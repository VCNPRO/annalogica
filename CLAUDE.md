# Claude Code - Configuración para Annalogica

## 🚀 Comandos Rápidos

### Desarrollo
```bash
cd "C:\Users\Usuario\annalogica"
npm run dev
```

### Build y Test
```bash
npm run build
npm run start
```

## 🔧 Contexto para Claude

**Proyecto:** Annalogica - App transcripción audio con IA
**Estado:** Migración completa AWS → Replicate/Vercel ✅
**Puerto:** http://localhost:3000
**Framework:** Next.js 15.5.4 + TypeScript + Tailwind
**Última actualización:** 2025-10-06

### Archivos Clave
- `app/page.tsx` - Dashboard principal (refactorizado)
- `app/api/process/route.ts` - Procesamiento con Replicate + Claude
- `app/api/auth/` - Autenticación JWT
- `lib/users-db.ts` - Base datos usuarios (in-memory)
- `.env.local` - Variables entorno (configurado con JWT_SECRET)

### Funcionalidades
1. ✅ Carga archivos audio/video → Vercel Blob
2. ✅ Transcripción → AssemblyAI
3. ✅ Generación SRT + TXT + VTT + Speakers
4. ✅ Resúmenes y Tags → AssemblyAI LeMUR (multiidioma)
5. ✅ Descarga PDF
6. ✅ Dashboard con dark/light mode
7. ✅ Autenticación JWT

### Problemas Resueltos
1. Error sintaxis línea 566 → Refactorización completa
2. Error JSON/HTML → Rutas API corregidas
3. Conflictos puerto → App en 3000
4. Dependencias → Instaladas correctamente
5. Variables entorno → `.env.local` configurado

### Configuración Requerida
Editar `.env.local` con tus tokens:
- `ASSEMBLYAI_API_KEY` → https://www.assemblyai.com/dashboard/api-keys
- `BLOB_READ_WRITE_TOKEN` → Vercel Dashboard
- `JWT_SECRET` → ✅ Ya generado automáticamente
- `CRON_SECRET` → Generar token aleatorio para seguridad del cron job

**NOTA:** Ya NO se necesita `CLAUDE_API_KEY`. Se usa AssemblyAI LeMUR para resúmenes.

### Retención de Archivos
**IMPORTANTE**: Política de almacenamiento actualizada (2025-10-10)

**Archivos guardados en Vercel Blob (30 días):**
- ✅ Transcripciones (TXT)
- ✅ Subtítulos (SRT y VTT)
- ✅ Resúmenes (TXT)
- ✅ Reportes de hablantes
- ✅ Tags y metadatos

**Archivos que NO se guardan:**
- ❌ **Archivos de audio/video originales** → Eliminados inmediatamente tras transcripción exitosa
- ⚡ Implementado en: `lib/inngest/functions.ts` (step: 'delete-original-audio')
- 💰 Ahorro: ~95% de espacio de almacenamiento

**Limpieza automática:**
- Cron job diario (2:00 AM UTC) → `/api/cron/cleanup`
- Configurado en `vercel.json`
- Requiere `CRON_SECRET` en variables de entorno de Vercel
- Ver detalles completos en `INSTRUCCIONES-ALMACENAMIENTO.md`

## 📖 Guía de Usuario

### Generar PDF de Guía
```bash
npm run generate-guide
```

Esto genera `public/guia-usuario-annalogica.pdf` con:
- Información actualizada de precios desde annalogica.eu
- URLs correctas (annalogica.eu)
- Todos los planes: Free, Básico (€49), Pro (€99), Business (€249), Universidad (€999), Medios (€2.999), Empresarial

### Endpoints
- `GET /api/user-guide` - Descarga la guía de usuario en PDF
- `GET /guia-usuario-annalogica.pdf` - Acceso directo al PDF estático
