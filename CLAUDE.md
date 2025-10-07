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
2. ✅ Transcripción → Replicate Whisper
3. ✅ Generación SRT + TXT
4. ✅ Resúmenes → Claude API
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
- `BLOB_READ_WRITE_TOKEN` → Vercel Dashboard
- `REPLICATE_API_TOKEN` → https://replicate.com/account/api-tokens
- `CLAUDE_API_KEY` → https://console.anthropic.com/settings/keys
- `JWT_SECRET` → ✅ Ya generado automáticamente