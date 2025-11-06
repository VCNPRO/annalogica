# 🔥 PRUEBAS DE ESTRÉS - ANNALOGICA

Sistema completo de pruebas de estrés para validar límites y robustez del sistema.

**Coste total estimado:** €0.076

---

## 📋 PREREQUISITOS

### 1. FFmpeg Instalado

El sistema usa FFmpeg para generar archivos de audio sintéticos (ruido blanco).

**Verificar instalación:**
```bash
ffmpeg -version
```

**Si no está instalado:**

- **Windows:** Descargar de https://ffmpeg.org/download.html
  - Agregar a PATH: `C:\ffmpeg\bin`

- **Mac:**
  ```bash
  brew install ffmpeg
  ```

- **Linux:**
  ```bash
  sudo apt install ffmpeg
  ```

### 2. Servidor en Ejecución

```bash
npm run dev
```

El servidor debe estar corriendo en `http://localhost:3000`

---

## 🚀 EJECUTAR PRUEBAS

### Opción 1: Comando NPM (Recomendado)

```bash
npm run stress-test
```

### Opción 2: Directamente con Node

```bash
node scripts/stress-test-simple.js
```

---

## 📊 FASES DEL TEST

El sistema ejecuta 4 fases graduales:

### **FASE 1: Baseline (1 archivo, 30 min)**
- **Objetivo:** Verificar funcionamiento básico
- **Archivos:** 1 audio de 30 minutos
- **Modo:** Secuencial
- **Coste:** ~€0.003
- **Valida:** Procesamiento correcto, tiempos normales

### **FASE 2: Concurrencia Baja (5 archivos, 15 min)**
- **Objetivo:** Verificar procesamiento paralelo
- **Archivos:** 5 audios de 15 minutos simultáneos
- **Modo:** Paralelo
- **Coste:** ~€0.007
- **Valida:** No hay errores, polling funciona

### **FASE 3: Concurrencia Media (10 archivos, 30 min)**
- **Objetivo:** Saturar Inngest Free tier (10 concurrent)
- **Archivos:** 10 audios de 30 minutos simultáneos
- **Modo:** Paralelo
- **Coste:** ~€0.028
- **Valida:** Queue de Inngest, manejo de límites

### **FASE 4: Concurrencia Alta (50 archivos, 5 min)** ⚠️ OMITIDA POR DEFECTO
- **Objetivo:** Saturar OpenAI Whisper RPM (100/min)
- **Archivos:** 50 audios de 5 minutos simultáneos
- **Modo:** Paralelo
- **Coste:** ~€0.023
- **Valida:** Rate limiting, retries

### **FASE 5: Estrés Total (100 archivos, 3 min)** ⚠️ OMITIDA POR DEFECTO
- **Objetivo:** Máxima capacidad del sistema
- **Archivos:** 100 audios de 3 minutos simultáneos
- **Modo:** Paralelo
- **Coste:** ~€0.020
- **Valida:** Degradación, manejo de errores masivos

---

## 📈 EJEMPLO DE SALIDA

```
╔═══════════════════════════════════════════════════════════╗
║        🔥 ANNALOGICA STRESS TEST SIMPLIFICADO 🔥         ║
╚═══════════════════════════════════════════════════════════╝

🔍 Verificando FFmpeg...
✅ FFmpeg detectado

============================================================
🧪 FASE 1: 1 archivos de 30 minutos
   Modo: SECUENCIAL
============================================================

📦 Generando: test_p1_1_30min.mp3 (1800s)...
✅ Generado: test_p1_1_30min.mp3

📤 Iniciando procesamiento secuencial...

📤 Procesando: test_p1_1_30min.mp3...
✅ Completado: test_p1_1_30min.mp3 en 2.45s

📊 RESULTADOS FASE 1:
   ✅ Exitosos: 1/1
   ❌ Errores: 0/1
   ⏱️  Tiempo: 42.34s
   ⚡ Throughput: 1.42 archivos/min
   💰 Coste estimado: €0.0026

============================================================
🧪 FASE 2: 5 archivos de 15 minutos
   Modo: PARALELO
============================================================

...

╔═══════════════════════════════════════════════════════════╗
║                📊 REPORTE FINAL                           ║
╚═══════════════════════════════════════════════════════════╝

📈 RESUMEN:
   Total archivos: 16
   ✅ Exitosos: 16
   ❌ Errores: 0
   ⏱️  Tiempo total: 285.67s
   ⚡ Throughput promedio: 3.35 archivos/min
   💰 Coste total: €0.0384

💡 RECOMENDACIONES:
   ✅ Todas las pruebas pasaron exitosamente!
   🚀 El sistema está listo para producción.

📄 Reporte guardado: stress-test-report.json
```

---

## 📄 REPORTE GENERADO

El sistema guarda un reporte detallado en:
```
stress-test-report.json
```

Contiene:
- Timestamp de ejecución
- Métricas por fase (tiempo, throughput, costes)
- Lista de errores (si los hubo)
- Recomendaciones automáticas

---

## 🔧 CONFIGURACIÓN AVANZADA

### Habilitar Fase 4 (50 archivos)

Editar `scripts/stress-test-simple.js`:

```javascript
// Descomentar esta línea:
await this.runPhase(4, 50, 5, true);
```

### Habilitar Fase 5 (100 archivos)

⚠️ **ADVERTENCIA:** Esto puede saturar completamente el sistema y generar costes mayores.

```javascript
// Descomentar esta línea:
await this.runPhase(5, 100, 3, true);
```

### Ajustar Parámetros

En el código, puedes modificar:
- `fileDuration`: Duración de cada archivo (minutos)
- `numFiles`: Número de archivos por fase
- `parallel`: true/false para procesamiento simultáneo

---

## 🧪 PRUEBAS CON API REAL

### Conectar al API Local

Modifica `scripts/stress-test-simple.js`:

```javascript
async processFile(filePath, filename) {
  // Reemplaza la simulación con:
  const FormData = require('form-data');
  const fs = require('fs');

  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));

  const response = await fetch('http://localhost:3000/api/blob-upload', {
    method: 'POST',
    body: formData
  });

  const data = await response.json();

  // Luego llamar a /api/process con el blobUrl
  // ...
}
```

---

## 📊 MÉTRICAS A OBSERVAR

### Durante las Pruebas

1. **Consola del navegador** (F12)
   - Logs de procesamiento
   - Errores de API

2. **Terminal del servidor** (npm run dev)
   - Logs de backend
   - Errores de OpenAI

3. **Vercel Dashboard** (en producción)
   - Function invocations
   - Error rate
   - Duration (P50, P99)

4. **OpenAI Dashboard**
   - Requests per minute
   - Rate limit errors

### Después de las Pruebas

Revisar `stress-test-report.json`:
- Throughput promedio (debe ser >5 archivos/min)
- Tasa de errores (debe ser <5%)
- Coste total (debe estar cerca de €0.076)

---

## ⚠️ PROBLEMAS COMUNES

### FFmpeg no encontrado

```
❌ FFmpeg no está instalado o no está en PATH.
```

**Solución:** Instalar FFmpeg y agregarlo al PATH del sistema.

### Error de permisos

```
Error: EACCES: permission denied
```

**Solución:**
```bash
chmod +x scripts/stress-test-simple.js
```

### Servidor no corriendo

```
Error: connect ECONNREFUSED 127.0.0.1:3000
```

**Solución:**
```bash
npm run dev
```

### Memoria insuficiente

```
Error: JavaScript heap out of memory
```

**Solución:** Reducir número de archivos en Fase 4 y 5.

---

## 🎯 INTERPRETACIÓN DE RESULTADOS

### ✅ PRUEBA EXITOSA

```
✅ Exitosos: 16/16
❌ Errores: 0
⚡ Throughput: >5 archivos/min
💰 Coste: €0.03-0.08
```

**Acción:** Sistema listo para producción

### ⚠️ PROBLEMAS DETECTADOS

**Fase 3 con errores (10 archivos)**
```
❌ Errores: 5/10
```
→ Inngest Free tier saturado (límite 10 concurrent)
→ **Solución:** Upgrade Inngest Pro o eliminar Inngest

**Fase 4 con errores (50 archivos)**
```
❌ Errores: 25/50
```
→ OpenAI Whisper rate limit (100 RPM)
→ **Solución:** Implementar queue management

**Throughput bajo (<3 archivos/min)**
→ Procesamiento lento
→ **Solución:** Optimizar código, verificar network

---

## 📞 SOPORTE

Si encuentras problemas:
1. Revisar logs en `stress-test-report.json`
2. Verificar consola del navegador
3. Verificar terminal del servidor
4. Revisar documentación de OpenAI Whisper
5. Contactar equipo técnico

---

## 📚 REFERENCIAS

- Informe Técnico Completo: `INFORME-TECNICO-SISTEMA-2025.md`
- Sección 5: Plan de Pruebas de Estrés (Sin Coste)
- OpenAI Whisper Limits: https://platform.openai.com/docs/guides/rate-limits
- Vercel Functions Limits: https://vercel.com/docs/functions/limits

---

**Última actualización:** 6 de Noviembre 2025
