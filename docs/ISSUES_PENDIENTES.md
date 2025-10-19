# Issues Pendientes - Annalogica

## 🚨 CRÍTICO - Procesamiento Múltiple No Deseado

**Problema**: Cuando el usuario selecciona solo "Transcribir", el sistema genera TODOS los resultados:
- Transcripción ✓
- Oradores (no solicitado)
- Resumen (no solicitado)
- Subtítulos SRT/VTT (no solicitados)
- Tags (no solicitados)

**Causa**: El flujo de Inngest está hardcodeado para generar todo automáticamente:
1. `transcribeFile` genera: transcripción + oradores + subtítulos
2. `summarizeFile` se dispara automáticamente y genera: resumen + tags

**Ubicación del Código**:
- `lib/inngest/functions.ts` líneas 58-123 (transcribeFile)
- `lib/inngest/functions.ts` líneas 95-160 (summarizeFile - auto-triggered)

**Solución Necesaria**:
1. Modificar `app/api/process/route.ts` para recibir acciones seleccionadas
2. Pasar `actions` array al crear el job en DB
3. Modificar `transcribeFile` para generar solo lo solicitado
4. NO auto-trigger `summarizeFile` - solo si se solicitó resumen/tags
5. Generar SRT/VTT solo si se solicitaron subtítulos
6. Generar reporte de oradores solo si se solicitó

**Impacto**: ALTO - Cliente paga/gasta cuota por procesamiento no solicitado

---

## 🎯 Identificación de Oradores No Funciona

**Problema**: El reporte de oradores muestra:
```
1. Speaker A
   Intervenciones: 25
   Palabras: 1234
   Tiempo: 5:30
```

Pero debería mostrar (cuando hay nombres/cargos):
```
1. Speaker A - María García (Directora de Comunicación)
   Intervenciones: 25
   Palabras: 1234
   Tiempo: 5:30
```

**Causa Posible**:
1. **Modelo Haiku menos potente**: Cambiamos de Sonnet a Haiku para ahorrar costes
   - Haiku: ~70% más barato pero menos capaz para tareas complejas
   - Esta tarea requiere análisis contextual profundo

2. **Fallos silenciosos**: El código actual captura errores pero continúa
   - Línea 64-69 en `lib/inngest/functions.ts`
   - Si LeMUR falla, simplemente devuelve `{}`

3. **Audio de prueba sin presentaciones**: Si el audio no tiene presentaciones explícitas, no hay nada que extraer

**Solución Propuesta**:
- OPCIÓN A: Volver a Sonnet para identificación de speakers (más caro pero funciona)
- OPCIÓN B: Añadir logging detallado para debug
- OPCIÓN C: Crear endpoint de test manual para probar con transcripción conocida

**Ubicación del Código**:
- `lib/assemblyai-client.ts` líneas 313-201 (identifySpeakersWithLeMUR)
- `lib/inngest/functions.ts` líneas 62-69 (llamada con error handling)

---

## 🎨 UI - Botón de Precios Missing

**Problema**: No hay acceso visible a la página de precios desde el dashboard

**Solución**: Añadir botón "Precios" en la barra superior derecha junto a:
- ? (Ayuda)
- 🌙/☀️ (Tema)
- ⚙️ (Ajustes)
- 🚪 (Cerrar sesión)

**Ubicación**: `app/page.tsx` línea ~885 (top-right action buttons)

---

## 📏 UI - Botón Ajustes Altura Incorrecta

**Problema**: El botón "Ajustes" tiene texto que hace que el rectángulo sea más alto que los otros botones

**Solución**:
- Reducir tamaño de fuente O
- Cambiar a icono solo (como los otros botones)

**Ubicación**: `app/page.tsx` línea ~905

---

## 📚 DOCUMENTACIÓN - Guía de Usuario Completa

**Requisitos**:
1. **Guía Quick Start** (2-3 páginas)
   - Registro y primer uso
   - Cargar audio
   - Seleccionar acciones
   - Descargar resultados

2. **Guía Detallada Completa** (15-20 páginas)
   - Introducción a Annalogica
   - Casos de uso (empresas, instituciones, medios)
   - Explicación de cada funcionalidad:
     * Transcripción multiidioma
     * Identificación de oradores
     * Generación de resúmenes
     * Subtítulos SRT/VTT
     * Tags automáticos
     * Formatos de descarga
   - Gestión de archivos procesados
   - Límites y cuotas por plan
   - Política de retención (30 días)
   - Preguntas frecuentes
   - Solución de problemas
   - Soporte técnico

3. **Descarga en PDF** con maquetación profesional
   - Logo y branding Annalogica
   - Índice navegable
   - Capturas de pantalla
   - Ejemplos reales
   - Tipografía legible
   - Formato A4

**Ubicación Propuesta**:
- Crear `app/guia/page.tsx` para versión web
- Crear `public/docs/guia-usuario.pdf` para descarga
- Botón ? en dashboard linkea a `/guia`

---

## ⏱️ Prioridades

1. **CRÍTICO** - Fix procesamiento múltiple no deseado
2. **ALTO** - Debug identificación de oradores
3. **MEDIO** - Añadir botón Precios
4. **MEDIO** - Ajustar botón Ajustes
5. **MEDIO** - Crear guía de usuario

---

## 🔍 Debug Logs Necesarios

Para diagnosticar el problema de oradores, necesitamos:

```javascript
// En lib/inngest/functions.ts línea 64
console.log('[DEBUG] Calling identifySpeakersWithLeMUR with:', {
  transcriptId: transcriptionResult.id,
  language: job.language,
  utterancesCount: transcriptionResult.utterances?.length
});

const speakerIdentities = await identifySpeakersWithLeMUR(...);

console.log('[DEBUG] Speaker identities result:', JSON.stringify(speakerIdentities, null, 2));
```

Esto nos dirá si:
- LeMUR está siendo llamado
- LeMUR está devolviendo resultados
- Los resultados están siendo parseados correctamente
