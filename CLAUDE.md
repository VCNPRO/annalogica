# Claude Code - Configuración para Annalogica

## 🚀 Comandos Rápidos

### Desarrollo
```bash
cd "C:\Users\La Bestia\proyectos\annalogica-final"
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
**Puerto:** http://localhost:3006
**Framework:** Next.js 15.5.4 + TypeScript + Tailwind

### Archivos Clave
- `app/page.tsx` - Dashboard principal (refactorizado)
- `app/api/auth/` - Autenticación JWT
- `lib/users-db.ts` - Base datos usuarios
- `.env.local` - Variables entorno

### Problemas Resueltos
1. Error sintaxis línea 566 → Refactorización completa
2. Error JSON/HTML → Rutas API corregidas
3. Conflictos puerto → App en 3006

### Tokens Pendientes
- BLOB_READ_WRITE_TOKEN (Vercel)
- REPLICATE_API_TOKEN (Whisper)
- CLAUDE_API_KEY (Resúmenes)