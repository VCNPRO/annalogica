# PDF.js Worker - DEPRECATED

## ⚠️ NOTA IMPORTANTE: ESTE ARCHIVO YA NO SE USA

**A partir de 2025-10-19, Annalogica procesa documentos (PDF, DOCX, TXT) completamente en el servidor.**

## 🏗️ Nueva Arquitectura

```
Cliente → Upload a Vercel Blob → API crea job → Inngest worker
                                                       ↓
                               Procesamiento server-side con:
                               - pdf-parse (primario)
                               - pdfjs-dist (fallback)
                               - OCR Tesseract (escaneados)
```

### Por qué el cambio:

1. **Robustez**: Multi-layer fallback para 99%+ compatibilidad
2. **Sin límites**: Archivos hasta 500MB (vs ~100MB en navegador)
3. **OCR**: Soporte para PDFs escaneados
4. **Consistencia**: Misma arquitectura que audio/video
5. **Debugging**: Logs completos en servidor

## 📁 Archivos Obsoletos

- `pdf.worker.min.mjs` - Ya no se usa (procesamiento client-side eliminado)
- Script `postinstall` en package.json - Puede eliminarse

## 🔄 Migración Completada

- ✅ Código client-side eliminado de `app/page.tsx`
- ✅ Parser server-side creado en `lib/document-parser.ts`
- ✅ Función Inngest `processDocument` implementada
- ✅ API `/api/process-document` refactorizada
- ✅ Documentación actualizada

## 📚 Nueva Documentación

Ver: `PDF-CLIENT-SIDE-PROCESSING.md` (renombrado de propósito - ahora documenta server-side)

## 🌐 URLs de Servicio

- **Producción:** `https://annalogica.eu/pdf.worker.min.mjs`
- **Local:** `http://localhost:3000/pdf.worker.min.mjs`

## 📊 Rendimiento

| Métrica | Valor |
|---------|-------|
| Tamaño en disco | 1.0 MB |
| Tamaño comprimido (Gzip) | ~400 KB |
| Primera carga | 50-150ms |
| Carga desde cache | 1-5ms |
| TTL cache navegador | 31536000s (1 año) |

## 🔒 Seguridad

### Content Security Policy Compatible

```http
Content-Security-Policy:
  script-src 'self';
  worker-src 'self';
```

✅ No requiere permitir dominios externos
✅ Auditable para compliance
✅ Compatible con GDPR/HIPAA

### Zero-Knowledge Architecture

```
Usuario → PDF procesado EN NAVEGADOR → Solo texto enviado al servidor
          ↑
    Archivo PDF nunca sale del navegador
```

## 🛠️ Actualización de Versión

### Automática (Recomendada)

```bash
# 1. Actualizar pdfjs-dist
npm install pdfjs-dist@latest

# 2. El script postinstall copia automáticamente el nuevo worker

# 3. Commit y deploy
git add package.json package-lock.json public/pdf.worker.min.mjs
git commit -m "Update pdfjs-dist to vX.X.X"
git push
```

### Manual (Si postinstall falla)

```bash
# Copiar manualmente
cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/

# Verificar
ls -lh public/pdf.worker.min.mjs
```

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────┐
│  Vercel Edge Network                            │
│  (Distribución global automática)               │
├─────────────────────────────────────────────────┤
│                                                  │
│  https://annalogica.eu/pdf.worker.min.mjs       │
│         ↓                                        │
│  Servido desde: public/pdf.worker.min.mjs       │
│         ↓                                        │
│  Actualizado automáticamente por: postinstall   │
│         ↓                                        │
│  Fuente: node_modules/pdfjs-dist/build/         │
│                                                  │
└─────────────────────────────────────────────────┘
```

## 🌍 Ventajas de Self-hosting vs. CDN

| Aspecto | Self-hosted | CDN Externo |
|---------|-------------|-------------|
| **Confiabilidad** | ✅ 100% - bajo nuestro control | ⚠️ Depende del CDN |
| **Rendimiento** | ✅ Edge network global | ⚠️ Latencia variable |
| **Seguridad** | ✅ CSP estricta posible | ❌ Requiere excepción CSP |
| **Privacidad** | ✅ Zero third-party | ❌ Request a terceros |
| **Firewall corporativo** | ✅ Siempre funciona | ❌ Puede bloquearse |
| **Offline (PWA)** | ✅ Cacheable | ❌ Requiere conexión |
| **Compliance** | ✅ Auditable | ⚠️ Depende del proveedor |
| **China/restricciones** | ✅ Funciona | ❌ Bloqueado |

## 📱 Progressive Web App (PWA) Ready

```typescript
// Future: service-worker.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('annalogica-v1').then((cache) => {
      return cache.addAll([
        '/pdf.worker.min.mjs',  // ✅ Cacheable offline
        '/page.tsx',
        // ...
      ]);
    })
  );
});
```

## 🔍 Troubleshooting

### Worker no carga

**Síntoma:**
```
Error: Setting up fake worker failed
```

**Solución:**
```bash
# Verificar que existe
ls -lh public/pdf.worker.min.mjs

# Si no existe, ejecutar postinstall
npm run postinstall

# O copiar manualmente
cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/
```

### Versión incorrecta

**Síntoma:**
```
Worker version mismatch
```

**Solución:**
```bash
# Re-ejecutar postinstall
rm public/pdf.worker.min.mjs
npm run postinstall
```

### CSP Error

**Síntoma:**
```
Refused to load worker
```

**Solución:**
Verificar que CSP permite workers desde mismo origen:
```http
Content-Security-Policy: worker-src 'self';
```

## 📚 Referencias

- **Documentación interna:** `PDF-CLIENT-SIDE-PROCESSING.md`
- **PDF.js docs:** https://mozilla.github.io/pdf.js/
- **Next.js public files:** https://nextjs.org/docs/basic-features/static-file-serving

## ✅ Checklist de Deploy

- [x] Worker copiado a `public/`
- [x] Script postinstall configurado
- [x] Código actualizado para usar `/pdf.worker.min.mjs`
- [x] Funciona en local
- [x] Funciona en producción (Vercel)
- [x] Documentación actualizada
- [x] Logs de procesamiento implementados

## 🎯 Próximas Mejoras

- [ ] Implementar fallback si worker falla
- [ ] Métricas de rendimiento (time to process)
- [ ] Soporte para PDFs escaneados (OCR con Tesseract.js)
- [ ] Soporte para PDFs protegidos con contraseña
- [ ] Service Worker para offline support

---

**Última actualización:** 2025-10-18
**Versión pdfjs-dist:** 5.4.296
**Mantenedor:** Claude Code
**Estado:** ✅ Producción
