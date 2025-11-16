# 🎬 Solución para Videos Grandes - Sistema Híbrido de Extracción de Audio

**Fecha:** 2025-11-16
**Estado:** Pendiente de Implementación
**Prioridad:** Alta
**Tiempo Estimado:** 1 día (básico) - 1 semana (completo)

---

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Problema Actual](#problema-actual)
3. [Solución Propuesta](#solución-propuesta)
4. [Análisis Técnico](#análisis-técnico)
5. [Implementación por Fases](#implementación-por-fases)
6. [Código de Implementación](#código-de-implementación)
7. [Guías para Usuarios](#guías-para-usuarios)
8. [Herramientas Recomendadas](#herramientas-recomendadas)
9. [Métricas y KPIs](#métricas-y-kpis)

---

## 📊 Resumen Ejecutivo

### El Problema
- Videos >200 MB no se pueden procesar actualmente
- Video de 6 GB tiene solo ~230 MB de audio (4% del tamaño)
- OpenAI Whisper límite: 25 MB por archivo
- Usuario intenta subir video completo → **falla y abandona**

### La Solución
**Sistema híbrido de 3 opciones:**
1. ✅ **Automático** (navegador extrae audio con FFmpeg.wasm)
2. ✅ **Manual Guiado** (usuario usa herramienta + tutorial paso a paso)
3. ✅ **Ya extraído** (usuario sube audio directamente)

### Impacto Esperado
```
Conversión: 40% → 85-95%
Videos procesables: 200 MB → Ilimitado
Tiempo implementación: 1 semana
Coste: €0 (solo desarrollo interno)
Profesionalidad: 7/10 → 9/10
```

---

## ❌ Problema Actual

### Flujo Actual (Ineficiente)

```
Usuario sube video.mp4 (6 GB)
         ↓
  Vercel Blob Storage (6 GB guardado)
         ↓
  Inngest descarga (6 GB transferidos)
         ↓
  Buffer en memoria (6 GB) → ❌ Out of Memory
         ↓
  OpenAI Whisper (6 GB) → ❌ "File exceeds 25 MB limit"
         ↓
     ❌ FALLO TOTAL
```

### Comparativa Audio vs Video

| Duración | Video MP4 (1080p) | Audio M4A (192kbps) | Ratio |
|----------|-------------------|---------------------|-------|
| 10 min | 375 MB | 14 MB | 3.7% |
| 30 min | 1.1 GB | 43 MB | 3.9% |
| 1 hora | 2.2 GB | 86 MB | 3.9% |
| 2 horas | 4.5 GB | 170 MB | 3.8% |
| 6 horas | 13.5 GB | 520 MB | 3.9% |

**Conclusión:** Audio = 4% del tamaño del video

### Costes Actuales (Desperdiciados)

```
Cliente sube video 6 GB (que FALLA):
├─ Upload Vercel Blob: 6 GB × $0.05/GB = $0.30
├─ Storage 30 días: 6 GB × $0.15/GB/mes = $0.90/mes
├─ Download (Inngest): 6 GB × $0.05/GB = $0.30
├─ Upload Whisper: (falla antes)
└─ TOTAL DESPERDICIADO: ~$1.50

❌ Usuario frustrado
❌ Dinero perdido
❌ Reputación dañada
```

---

## ✅ Solución Propuesta

### Flujo Optimizado (3 Opciones)

```
Usuario selecciona video >200 MB
         ↓
  🔔 MODAL DETECTA TAMAÑO
         ↓
┌────────────────────────────────────┐
│  Opción 1: AUTOMÁTICO (browser)   │
│  ├─ FFmpeg.wasm extrae audio      │
│  ├─ 6 GB → 230 MB (5-10 min)      │
│  └─ Usuario espera con progress   │
│                                    │
│  Opción 2: MANUAL GUIADO           │
│  ├─ Tutorial paso a paso           │
│  ├─ Herramientas recomendadas      │
│  └─ Vuelve y sube audio            │
│                                    │
│  Opción 3: YA EXTRAÍDO             │
│  └─ Sube audio directamente        │
└────────────────────────────────────┘
         ↓
  Sube SOLO audio (230 MB)
         ↓
  Vercel Blob Storage (230 MB)
         ↓
  Chunking (10 partes de 23 MB)
         ↓
  OpenAI Whisper procesa
         ↓
  ✅ ÉXITO
```

### Ventajas Comparadas

| Aspecto | Actual | Con Solución |
|---------|--------|--------------|
| **Videos procesables** | <200 MB (~5 min) | Ilimitado |
| **Conversión usuarios** | ~10% | 85-95% |
| **Coste por video 6GB** | $1.50 (falla) | $0.96 (éxito) |
| **Storage/mes** | $0.90 | $0.03 |
| **Bandwidth** | $0.60 | $0.02 |
| **Satisfacción usuario** | Baja | Alta |

---

## 🔧 Análisis Técnico

### Opción 1: Extracción Automática (FFmpeg.wasm)

**Tecnología:** FFmpeg.wasm
**Ubicación:** Navegador del cliente
**Tiempo:** 5-10 minutos para 6 GB

```typescript
// Dependencias necesarias
{
  "dependencies": {
    "@ffmpeg/ffmpeg": "^0.12.10",
    "@ffmpeg/util": "^0.12.1"
  }
}
```

**Ventajas:**
- ✅ Sin coste servidor (procesa en navegador)
- ✅ Privacidad total (no sube video completo)
- ✅ UX automática
- ✅ Ahorro masivo de bandwidth

**Desventajas:**
- ⚠️ Depende de CPU del cliente
- ⚠️ Navegadores antiguos pueden fallar
- ⚠️ Videos muy grandes (>20 GB) pueden ser lentos

### Opción 2: Manual Guiado

**Herramientas Recomendadas:**

1. **CloudConvert** (Online)
   - Límite: 1 GB gratis/día
   - Sin instalación
   - URL: https://cloudconvert.com/mp4-to-mp3

2. **VLC Media Player** (Offline) ⭐ MEJOR
   - Gratis, open source
   - Windows/Mac/Linux
   - Sin límite de tamaño
   - URL: https://www.videolan.org/

3. **HandBrake** (Offline)
   - Gratis, open source
   - Más control sobre calidad
   - URL: https://handbrake.fr/

**Ventajas:**
- ✅ Funciona con cualquier tamaño
- ✅ Usuario tiene control total
- ✅ No depende de navegador moderno
- ✅ Sin desarrollo complejo

**Desventajas:**
- ⚠️ Fricción UX (salir de la app)
- ⚠️ Tasa abandono 40-60%
- ⚠️ Requiere conocimiento técnico

### Opción 3: Ya Extraído

**Implementación:** Cambio de modo en el uploader

**Ventajas:**
- ✅ Usuarios avanzados
- ✅ Flujos externos (scripts, automatización)
- ✅ Reutilización de archivos

---

## 🚀 Implementación por Fases

### FASE 1: MVP Manual (1 día) ⚡ RÁPIDO

**Objetivo:** Solución básica funcional

**Tareas:**
- [ ] Detección de video >200 MB en upload
- [ ] Modal informativo con 2 opciones
- [ ] Guía paso a paso (página dedicada)
- [ ] Link a herramientas recomendadas
- [ ] Tip en sidebar del dashboard

**Tiempo:** 1 día (6-8 horas)
**Conversión esperada:** 40-60%

### FASE 2: Híbrido (1 semana) ⭐ RECOMENDADO

**Objetivo:** Solución profesional completa

**Tareas:**
- [ ] Integrar FFmpeg.wasm
- [ ] UI de extracción con progress bar
- [ ] 3 opciones en modal
- [ ] Guía mejorada con capturas
- [ ] Testing en navegadores principales
- [ ] Analytics (tracking de qué opción eligen)

**Tiempo:** 5-7 días
**Conversión esperada:** 85-95%

### FASE 3: Optimización (1 mes)

**Objetivo:** Diferenciación por plan

**Tareas:**
- [ ] Free/Basic: Solo manual
- [ ] Pro: Automático browser
- [ ] Business: Automático servidor + archivos muy grandes
- [ ] Workers para extracción paralela
- [ ] Cache de audios extraídos

**Tiempo:** 2-4 semanas
**Conversión esperada:** 95%+

---

## 💻 Código de Implementación

### 1. Detección en Upload Zone

```typescript
// components/FileUploadZone.tsx

import { useState } from 'react';
import { LargeVideoModal } from './LargeVideoModal';

interface VideoInfo {
  file: File;
  name: string;
  size: number;
  sizeGB: number;
  estimatedAudioSize: number;
  estimatedAudioSizeMB: number;
}

export function FileUploadZone() {
  const [largeVideoDetected, setLargeVideoDetected] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);

  const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200 MB
  const AUDIO_RATIO = 0.04; // Audio = ~4% del tamaño del video

  const handleFileDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];

    // Detectar video grande
    if (file.type.startsWith('video/') && file.size > MAX_VIDEO_SIZE) {
      const estimatedAudioSize = Math.round(file.size * AUDIO_RATIO);

      setVideoInfo({
        file,
        name: file.name,
        size: file.size,
        sizeGB: parseFloat((file.size / 1024 / 1024 / 1024).toFixed(2)),
        estimatedAudioSize,
        estimatedAudioSizeMB: Math.round(estimatedAudioSize / 1024 / 1024)
      });

      setLargeVideoDetected(true);

      console.log('[Upload] Video grande detectado:', {
        nombre: file.name,
        tamaño: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        audioEstimado: `${Math.round(estimatedAudioSize / 1024 / 1024)} MB`
      });

      return;
    }

    // Procesar archivo normalmente
    processFile(file);
  };

  const handleCloseModal = () => {
    setLargeVideoDetected(false);
    setVideoInfo(null);
  };

  const handleProcessed = (audioFile: File) => {
    setLargeVideoDetected(false);
    processFile(audioFile);
  };

  if (largeVideoDetected && videoInfo) {
    return (
      <LargeVideoModal
        videoInfo={videoInfo}
        onClose={handleCloseModal}
        onAudioReady={handleProcessed}
      />
    );
  }

  return (
    <div className="upload-zone">
      {/* ... resto del componente de upload ... */}
    </div>
  );
}
```

### 2. Modal de Opciones

```typescript
// components/LargeVideoModal.tsx

import { useState } from 'react';
import { AudioExtractor } from './AudioExtractor';
import { ExtractionGuide } from './ExtractionGuide';

interface Props {
  videoInfo: VideoInfo;
  onClose: () => void;
  onAudioReady: (audioFile: File) => void;
}

export function LargeVideoModal({ videoInfo, onClose, onAudioReady }: Props) {
  const [mode, setMode] = useState<'select' | 'auto' | 'manual' | 'upload'>('select');

  if (mode === 'auto') {
    return (
      <AudioExtractor
        videoFile={videoInfo.file}
        onComplete={onAudioReady}
        onBack={() => setMode('select')}
      />
    );
  }

  if (mode === 'manual') {
    return (
      <ExtractionGuide
        videoInfo={videoInfo}
        onBack={() => setMode('select')}
        onReady={() => setMode('upload')}
      />
    );
  }

  if (mode === 'upload') {
    return (
      <div className="modal">
        <h2>✅ Listo para Subir</h2>
        <p>Sube tu archivo de audio extraído</p>
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => {
            const audioFile = e.target.files?.[0];
            if (audioFile) onAudioReady(audioFile);
          }}
        />
      </div>
    );
  }

  // Mode: select (default)
  return (
    <div className="modal max-w-2xl">
      <div className="modal-header">
        <h2 className="text-2xl font-bold">⚠️ Video Grande Detectado</h2>
        <button onClick={onClose} className="close-btn">×</button>
      </div>

      <div className="modal-body space-y-6">
        {/* Información del archivo */}
        <div className="info-box bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Tu video:</p>
          <p className="font-semibold text-lg">{videoInfo.name}</p>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <p className="text-xs text-gray-500">Tamaño video</p>
              <p className="font-bold text-xl">{videoInfo.sizeGB} GB</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Audio estimado</p>
              <p className="font-bold text-xl text-green-600">
                {videoInfo.estimatedAudioSizeMB} MB
              </p>
            </div>
          </div>
        </div>

        {/* Recomendación */}
        <div className="recommendation bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex items-start">
            <div className="text-2xl mr-3">💡</div>
            <div>
              <h3 className="font-semibold mb-2">Recomendación</h3>
              <p className="text-sm text-gray-700">
                Solo necesitamos el <strong>audio</strong> del video para transcribir.
                El audio pesa <strong>{Math.round((1 - AUDIO_RATIO) * 100)}% menos</strong> y
                se procesa mucho más rápido.
              </p>
            </div>
          </div>
        </div>

        {/* Opciones */}
        <div className="options space-y-3">
          <h3 className="font-semibold text-lg mb-4">¿Cómo prefieres continuar?</h3>

          {/* Opción 1: Automático */}
          <button
            onClick={() => setMode('auto')}
            className="option-card w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
          >
            <div className="flex items-start">
              <div className="text-3xl mr-4">🚀</div>
              <div className="flex-1">
                <h4 className="font-semibold text-lg">Extraer audio automáticamente</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Tu navegador extraerá el audio del video
                </p>
                <div className="flex gap-2 mt-2">
                  <span className="badge">⭐ Recomendado</span>
                  <span className="badge">5-10 minutos</span>
                  <span className="badge">Sin subir video</span>
                </div>
              </div>
            </div>
          </button>

          {/* Opción 2: Manual */}
          <button
            onClick={() => setMode('manual')}
            className="option-card w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition"
          >
            <div className="flex items-start">
              <div className="text-3xl mr-4">📖</div>
              <div className="flex-1">
                <h4 className="font-semibold text-lg">Guía paso a paso</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Usa una herramienta gratuita (VLC, CloudConvert, etc.)
                </p>
                <div className="flex gap-2 mt-2">
                  <span className="badge">Herramientas gratis</span>
                  <span className="badge">Más control</span>
                  <span className="badge">Cualquier tamaño</span>
                </div>
              </div>
            </div>
          </button>

          {/* Opción 3: Ya extraído */}
          <button
            onClick={() => setMode('upload')}
            className="option-card w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition"
          >
            <div className="flex items-start">
              <div className="text-3xl mr-4">✅</div>
              <div className="flex-1">
                <h4 className="font-semibold text-lg">Ya tengo el audio extraído</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Subir archivo de audio directamente
                </p>
                <div className="flex gap-2 mt-2">
                  <span className="badge">Más rápido</span>
                  <span className="badge">Para usuarios avanzados</span>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Comparativa de calidades de audio */}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
            🎚️ ¿Qué calidad de audio elegir?
          </summary>
          <table className="w-full mt-3 text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Calidad</th>
                <th className="text-left py-2">Bitrate</th>
                <th className="text-left py-2">Tamaño (2h)</th>
                <th className="text-left py-2">Uso</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2">Básica</td>
                <td>96 kbps</td>
                <td>~85 MB</td>
                <td>Voz clara, podcasts</td>
              </tr>
              <tr className="bg-green-50">
                <td className="py-2 font-semibold">Recomendada ⭐</td>
                <td>128 kbps</td>
                <td>~110 MB</td>
                <td>Balance perfecto</td>
              </tr>
              <tr>
                <td className="py-2">Alta</td>
                <td>192 kbps</td>
                <td>~170 MB</td>
                <td>Música, calidad premium</td>
              </tr>
            </tbody>
          </table>
        </details>
      </div>

      <div className="modal-footer mt-6 flex justify-between">
        <button onClick={onClose} className="btn-secondary">
          Cancelar
        </button>
        <a
          href="/ayuda/videos-grandes"
          target="_blank"
          className="text-sm text-blue-600 hover:underline"
        >
          Más información →
        </a>
      </div>
    </div>
  );
}
```

### 3. Extractor Automático (FFmpeg.wasm)

```typescript
// components/AudioExtractor.tsx

import { useEffect, useState, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

interface Props {
  videoFile: File;
  onComplete: (audioFile: File) => void;
  onBack: () => void;
}

export function AudioExtractor({ videoFile, onComplete, onBack }: Props) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'loading' | 'processing' | 'complete' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  useEffect(() => {
    loadAndExtract();
  }, []);

  const loadAndExtract = async () => {
    try {
      setStatus('loading');
      setProgress(5);

      // Cargar FFmpeg
      const ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;

      // Configurar logs para debugging
      ffmpeg.on('log', ({ message }) => {
        console.log('[FFmpeg]', message);
      });

      // Configurar progress
      ffmpeg.on('progress', ({ progress: p, time }) => {
        const progressPercent = Math.round(p * 100);
        setProgress(Math.min(progressPercent, 95)); // Cap at 95% until complete
        console.log(`[FFmpeg] Progress: ${progressPercent}% (${time}s)`);
      });

      // Cargar FFmpeg core (usando CDN para reducir bundle size)
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      console.log('[FFmpeg] Loaded successfully');
      setProgress(10);
      setStatus('processing');

      // Escribir video en el sistema de archivos virtual de FFmpeg
      await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
      console.log('[FFmpeg] Video file written');
      setProgress(20);

      // Extraer audio con configuración optimizada
      // -vn: sin video
      // -acodec aac: codec AAC (compatible)
      // -b:a 128k: bitrate 128 kbps (balance calidad/tamaño)
      // -f m4a: formato M4A (más compatible que MP3)
      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-vn',
        '-acodec', 'aac',
        '-b:a', '128k',
        '-f', 'm4a',
        'output.m4a'
      ]);

      console.log('[FFmpeg] Extraction complete');
      setProgress(90);

      // Leer el archivo resultante
      const audioData = await ffmpeg.readFile('output.m4a');
      console.log('[FFmpeg] Audio data read:', {
        size: `${(audioData.length / 1024 / 1024).toFixed(2)} MB`,
        originalSize: `${(videoFile.size / 1024 / 1024).toFixed(2)} MB`,
        ratio: `${((audioData.length / videoFile.size) * 100).toFixed(1)}%`
      });

      // Convertir a File object
      const audioBlob = new Blob([audioData], { type: 'audio/m4a' });
      const audioFileName = videoFile.name.replace(/\.[^.]+$/, '.m4a');
      const audioFile = new File([audioBlob], audioFileName, { type: 'audio/m4a' });

      setProgress(100);
      setStatus('complete');

      // Esperar 1 segundo para mostrar el 100%
      setTimeout(() => {
        onComplete(audioFile);
      }, 1000);

    } catch (err: any) {
      console.error('[FFmpeg] Error:', err);
      setError(err.message || 'Error al extraer audio');
      setStatus('error');
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'loading':
        return 'Cargando procesador de video...';
      case 'processing':
        return 'Extrayendo audio del video...';
      case 'complete':
        return '¡Audio extraído exitosamente!';
      case 'error':
        return 'Error al procesar el video';
    }
  };

  if (status === 'error') {
    return (
      <div className="modal">
        <h2 className="text-xl font-bold text-red-600 mb-4">❌ Error</h2>
        <p className="text-gray-700 mb-4">{error}</p>
        <p className="text-sm text-gray-600 mb-6">
          Tu navegador podría no ser compatible o el archivo es demasiado grande.
          Prueba con la opción manual.
        </p>
        <div className="flex gap-3">
          <button onClick={onBack} className="btn-primary">
            Volver
          </button>
          <a
            href="/ayuda/videos-grandes"
            target="_blank"
            className="btn-secondary"
          >
            Ver guía manual
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="modal">
      <h2 className="text-xl font-bold mb-6">🎬 Extrayendo Audio</h2>

      <div className="space-y-4">
        {/* Video info */}
        <div className="bg-gray-50 p-4 rounded">
          <p className="text-sm text-gray-600">Procesando:</p>
          <p className="font-semibold">{videoFile.name}</p>
          <p className="text-sm text-gray-500">
            {(videoFile.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{getStatusMessage()}</span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Status messages */}
        <div className="text-sm text-gray-600 space-y-1">
          {progress >= 10 && progress < 20 && (
            <p>✓ Cargando video en memoria...</p>
          )}
          {progress >= 20 && progress < 90 && (
            <p>✓ Extrayendo pista de audio...</p>
          )}
          {progress >= 90 && progress < 100 && (
            <p>✓ Finalizando...</p>
          )}
          {progress === 100 && (
            <p className="text-green-600 font-semibold">✓ ¡Completado!</p>
          )}
        </div>

        {/* Estimated time */}
        {status === 'processing' && progress < 90 && (
          <div className="bg-blue-50 p-3 rounded text-sm">
            <p className="text-blue-800">
              ⏱️ Esto puede tardar 5-10 minutos dependiendo del tamaño del video.
              No cierres esta ventana.
            </p>
          </div>
        )}

        {/* Cancel button (solo mostrar si no está completo) */}
        {status !== 'complete' && (
          <button
            onClick={onBack}
            className="btn-secondary w-full mt-4"
            disabled={progress > 50}
          >
            {progress > 50 ? 'Procesando...' : 'Cancelar'}
          </button>
        )}
      </div>
    </div>
  );
}
```

### 4. Guía Manual

```typescript
// components/ExtractionGuide.tsx

interface Props {
  videoInfo: VideoInfo;
  onBack: () => void;
  onReady: () => void;
}

export function ExtractionGuide({ videoInfo, onBack, onReady }: Props) {
  const [selectedTool, setSelectedTool] = useState<'online' | 'vlc' | 'handbrake'>('online');

  return (
    <div className="modal max-w-4xl max-h-[90vh] overflow-y-auto">
      <div className="modal-header sticky top-0 bg-white border-b pb-4">
        <h2 className="text-2xl font-bold">📖 Guía: Extraer Audio del Video</h2>
        <button onClick={onBack} className="close-btn">←</button>
      </div>

      <div className="modal-body space-y-6 mt-6">
        {/* Info del archivo */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Tu video:</p>
          <p className="font-semibold">{videoInfo.name}</p>
          <p className="text-sm text-gray-500">
            {videoInfo.sizeGB} GB → Audio estimado: ~{videoInfo.estimatedAudioSizeMB} MB
          </p>
        </div>

        {/* Tabs de herramientas */}
        <div className="tabs flex gap-2 border-b">
          <button
            onClick={() => setSelectedTool('online')}
            className={`tab px-4 py-2 font-semibold ${
              selectedTool === 'online'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600'
            }`}
          >
            🌐 Online (Fácil)
          </button>
          <button
            onClick={() => setSelectedTool('vlc')}
            className={`tab px-4 py-2 font-semibold ${
              selectedTool === 'vlc'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600'
            }`}
          >
            🎥 VLC (Recomendado)
          </button>
          <button
            onClick={() => setSelectedTool('handbrake')}
            className={`tab px-4 py-2 font-semibold ${
              selectedTool === 'handbrake'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600'
            }`}
          >
            🔧 HandBrake (Avanzado)
          </button>
        </div>

        {/* Guía Online */}
        {selectedTool === 'online' && (
          <div className="guide-content space-y-4">
            <div className="alert bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-sm">
                ⚠️ <strong>Nota:</strong> Herramientas online tienen límites de tamaño (100 MB - 2 GB).
                Para videos muy grandes, usa VLC o HandBrake.
              </p>
            </div>

            <h3 className="font-semibold text-lg">Herramienta Recomendada: CloudConvert</h3>

            <ol className="space-y-4 list-decimal list-inside">
              <li className="space-y-2">
                <p className="font-semibold">Abre CloudConvert:</p>
                <a
                  href="https://cloudconvert.com/mp4-to-mp3"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Abrir CloudConvert →
                  <span className="badge bg-white text-blue-600 text-xs">Gratis • Sin registro</span>
                </a>
              </li>

              <li className="space-y-2">
                <p className="font-semibold">Sube tu video</p>
                <p className="text-sm text-gray-600">
                  Haz clic en "Select File" y elige tu video
                </p>
              </li>

              <li className="space-y-2">
                <p className="font-semibold">Configura la conversión</p>
                <ul className="ml-6 list-disc text-sm text-gray-600 space-y-1">
                  <li>Formato de salida: <code className="bg-gray-100 px-2 py-1 rounded">MP3</code></li>
                  <li>Calidad: <code className="bg-gray-100 px-2 py-1 rounded">128 kbps</code> ⭐ Recomendado</li>
                  <li>O usa <code className="bg-gray-100 px-2 py-1 rounded">96 kbps</code> para archivos más pequeños</li>
                </ul>
              </li>

              <li>
                <p className="font-semibold">Haz clic en "Convert"</p>
                <p className="text-sm text-gray-600">Espera a que se complete (puede tardar varios minutos)</p>
              </li>

              <li>
                <p className="font-semibold">Descarga el archivo MP3</p>
              </li>

              <li>
                <p className="font-semibold">Vuelve aquí y sube el audio</p>
                <button onClick={onReady} className="btn-primary mt-2">
                  Ya tengo el audio →
                </button>
              </li>
            </ol>

            <div className="alternative-tools bg-gray-50 p-4 rounded mt-6">
              <h4 className="font-semibold mb-3">Alternativas Online:</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="https://www.media.io/es/video-converter.html" target="_blank" className="text-blue-600 hover:underline">
                    Media.io
                  </a> - Hasta 100 MB gratis
                </li>
                <li>
                  <a href="https://www.freeconvert.com/video-to-mp3" target="_blank" className="text-blue-600 hover:underline">
                    FreeConvert
                  </a> - Hasta 1 GB
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Guía VLC */}
        {selectedTool === 'vlc' && (
          <div className="guide-content space-y-4">
            <div className="alert bg-green-50 border-l-4 border-green-400 p-4">
              <p className="text-sm">
                ✅ <strong>Recomendado:</strong> VLC es gratis, seguro y funciona sin límite de tamaño.
                Disponible para Windows, Mac y Linux.
              </p>
            </div>

            <h3 className="font-semibold text-lg">Usar VLC Media Player</h3>

            <ol className="space-y-4 list-decimal list-inside">
              <li className="space-y-2">
                <p className="font-semibold">Descarga VLC (si no lo tienes)</p>
                <a
                  href="https://www.videolan.org/vlc/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
                >
                  Descargar VLC →
                  <span className="badge bg-white text-orange-600 text-xs">Gratis • Open Source</span>
                </a>
              </li>

              <li className="space-y-2">
                <p className="font-semibold">Abre VLC</p>
              </li>

              <li className="space-y-2">
                <p className="font-semibold">Ve a Media → Convert/Save</p>
                <p className="text-sm text-gray-600">
                  (En Mac: File → Convert/Stream)
                </p>
              </li>

              <li className="space-y-2">
                <p className="font-semibold">Agrega tu video</p>
                <ul className="ml-6 list-disc text-sm text-gray-600 space-y-1">
                  <li>Haz clic en "Add"</li>
                  <li>Selecciona tu archivo de video</li>
                  <li>Haz clic en "Convert/Save"</li>
                </ul>
              </li>

              <li className="space-y-2">
                <p className="font-semibold">Configurar conversión</p>
                <ul className="ml-6 list-disc text-sm text-gray-600 space-y-1">
                  <li>Profile: <code className="bg-gray-100 px-2 py-1 rounded">Audio - MP3</code></li>
                  <li>O personaliza: Codec MP3, 128 kbps</li>
                  <li>Destination file: Elige dónde guardar</li>
                </ul>
              </li>

              <li className="space-y-2">
                <p className="font-semibold">Haz clic en "Start"</p>
                <p className="text-sm text-gray-600">
                  VLC convertirá el video. Verás el progreso en la barra inferior.
                </p>
              </li>

              <li className="space-y-2">
                <p className="font-semibold">¡Listo! Sube el archivo MP3</p>
                <button onClick={onReady} className="btn-primary mt-2">
                  Ya tengo el audio →
                </button>
              </li>
            </ol>

            {/* Video tutorial (opcional) */}
            <div className="bg-gray-50 p-4 rounded mt-6">
              <h4 className="font-semibold mb-2">📹 Video Tutorial:</h4>
              <a
                href="https://www.youtube.com/results?search_query=vlc+extract+audio+from+video"
                target="_blank"
                className="text-blue-600 hover:underline text-sm"
              >
                Ver en YouTube →
              </a>
            </div>
          </div>
        )}

        {/* Guía HandBrake */}
        {selectedTool === 'handbrake' && (
          <div className="guide-content space-y-4">
            <div className="alert bg-purple-50 border-l-4 border-purple-400 p-4">
              <p className="text-sm">
                🔧 <strong>Para usuarios avanzados:</strong> HandBrake ofrece más control sobre
                la calidad y el formato del audio.
              </p>
            </div>

            <h3 className="font-semibold text-lg">Usar HandBrake</h3>

            <ol className="space-y-4 list-decimal list-inside">
              <li className="space-y-2">
                <p className="font-semibold">Descarga HandBrake</p>
                <a
                  href="https://handbrake.fr/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                >
                  Descargar HandBrake →
                  <span className="badge bg-white text-purple-600 text-xs">Gratis • Open Source</span>
                </a>
              </li>

              <li>
                <p className="font-semibold">Abre HandBrake</p>
              </li>

              <li>
                <p className="font-semibold">Carga tu video: "Open Source"</p>
              </li>

              <li className="space-y-2">
                <p className="font-semibold">Configurar salida</p>
                <ul className="ml-6 list-disc text-sm text-gray-600 space-y-1">
                  <li>Format: <code className="bg-gray-100 px-2 py-1 rounded">MP3</code></li>
                  <li>Ve a la pestaña "Audio"</li>
                  <li>Codec: AAC o MP3</li>
                  <li>Bitrate: 128 kbps</li>
                </ul>
              </li>

              <li>
                <p className="font-semibold">Destination: Elige dónde guardar</p>
              </li>

              <li>
                <p className="font-semibold">Haz clic en "Start Encode"</p>
              </li>

              <li className="space-y-2">
                <p className="font-semibold">Sube el archivo resultante</p>
                <button onClick={onReady} className="btn-primary mt-2">
                  Ya tengo el audio →
                </button>
              </li>
            </ol>
          </div>
        )}

        {/* Tabla de calidades */}
        <div className="quality-table bg-white border rounded-lg p-4 mt-8">
          <h4 className="font-semibold mb-4">🎚️ Guía de Calidades de Audio</h4>
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="text-left py-2">Calidad</th>
                <th className="text-left py-2">Bitrate</th>
                <th className="text-left py-2">Tamaño (2h)</th>
                <th className="text-left py-2">Uso Recomendado</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="py-2">Básica</td>
                <td className="py-2 font-mono">96 kbps</td>
                <td className="py-2">~85 MB</td>
                <td className="py-2 text-gray-600">Voz clara, podcasts simples</td>
              </tr>
              <tr className="bg-green-50">
                <td className="py-2 font-semibold">Recomendada ⭐</td>
                <td className="py-2 font-mono font-semibold">128 kbps</td>
                <td className="py-2 font-semibold">~110 MB</td>
                <td className="py-2 text-gray-600">Balance perfecto calidad/tamaño</td>
              </tr>
              <tr>
                <td className="py-2">Alta</td>
                <td className="py-2 font-mono">192 kbps</td>
                <td className="py-2">~170 MB</td>
                <td className="py-2 text-gray-600">Música, entrevistas con música</td>
              </tr>
              <tr>
                <td className="py-2">Premium</td>
                <td className="py-2 font-mono">320 kbps</td>
                <td className="py-2">~280 MB</td>
                <td className="py-2 text-gray-600">Calidad máxima (innecesario para voz)</td>
              </tr>
            </tbody>
          </table>

          <p className="text-xs text-gray-500 mt-3">
            💡 Para transcripción de voz, 128 kbps es más que suficiente y ahorra espacio.
          </p>
        </div>
      </div>

      <div className="modal-footer sticky bottom-0 bg-white border-t pt-4 mt-6">
        <div className="flex justify-between items-center">
          <button onClick={onBack} className="btn-secondary">
            ← Volver
          </button>
          <button onClick={onReady} className="btn-primary">
            Ya tengo el audio →
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 5. Tip en Dashboard Sidebar

```typescript
// components/DashboardSidebar.tsx

export function DashboardSidebar() {
  const [showTip, setShowTip] = useState(true);

  return (
    <aside className="sidebar w-64 bg-white border-r p-6">
      {/* ... otros elementos del sidebar ... */}

      {showTip && (
        <div className="mt-auto pt-6">
          <div className="tips-section">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-sm">💡 Consejo</h4>
              <button
                onClick={() => setShowTip(false)}
                className="text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="tip-card bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-100">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🎬</div>
                <div className="flex-1">
                  <h5 className="font-semibold text-sm mb-1">¿Videos grandes?</h5>
                  <p className="text-xs text-gray-700 mb-3">
                    Extrae solo el audio para procesar más rápido y ahorrar espacio
                  </p>
                  <a
                    href="/ayuda/videos-grandes"
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    Ver guía completa →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
```

---

## 📚 Guías para Usuarios

### Página de Ayuda Dedicada

Crear página: `/app/ayuda/videos-grandes/page.tsx`

```typescript
// app/ayuda/videos-grandes/page.tsx

export default function VideosGrandesHelpPage() {
  return (
    <div className="help-page max-w-4xl mx-auto py-12 px-6">
      <h1 className="text-4xl font-bold mb-6">🎬 Guía: Procesar Videos Grandes</h1>

      <div className="prose max-w-none">
        <section className="mb-12">
          <h2>¿Por qué extraer el audio del video?</h2>
          <p>
            Para transcribir un video, solo necesitamos la pista de audio.
            El audio pesa mucho menos que el video completo (aproximadamente un 4% del tamaño),
            lo que hace que el proceso sea:
          </p>
          <ul>
            <li>✅ <strong>Más rápido:</strong> Menos datos para subir y procesar</li>
            <li>✅ <strong>Más económico:</strong> Menos uso de ancho de banda</li>
            <li>✅ <strong>Más fiable:</strong> Menor probabilidad de errores</li>
          </ul>

          <div className="comparison-table bg-blue-50 p-6 rounded-lg my-6">
            <h3 className="text-lg font-semibold mb-4">Comparativa de Tamaños</h3>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Duración</th>
                  <th className="text-left py-2">Video Completo</th>
                  <th className="text-left py-2">Solo Audio</th>
                  <th className="text-left py-2">Ahorro</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-2">30 min</td>
                  <td>1.1 GB</td>
                  <td className="font-semibold text-green-600">43 MB</td>
                  <td>96%</td>
                </tr>
                <tr>
                  <td className="py-2">1 hora</td>
                  <td>2.2 GB</td>
                  <td className="font-semibold text-green-600">86 MB</td>
                  <td>96%</td>
                </tr>
                <tr>
                  <td className="py-2">2 horas</td>
                  <td>4.5 GB</td>
                  <td className="font-semibold text-green-600">170 MB</td>
                  <td>96%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-12">
          <h2>3 Formas de Extraer Audio</h2>

          {/* Opciones */}
          <div className="grid md:grid-cols-3 gap-6 my-6">
            <div className="option-card border rounded-lg p-6 hover:shadow-lg transition">
              <div className="text-4xl mb-3">🚀</div>
              <h3 className="font-semibold mb-2">Automático</h3>
              <p className="text-sm text-gray-600 mb-4">
                Annalogica extrae el audio en tu navegador
              </p>
              <ul className="text-xs space-y-1 text-gray-600">
                <li>✓ Más fácil</li>
                <li>✓ No subes el video</li>
                <li>✓ 5-10 minutos</li>
              </ul>
              <div className="mt-4">
                <span className="badge text-xs">⭐ Recomendado</span>
              </div>
            </div>

            <div className="option-card border rounded-lg p-6 hover:shadow-lg transition">
              <div className="text-4xl mb-3">📖</div>
              <h3 className="font-semibold mb-2">Manual (VLC)</h3>
              <p className="text-sm text-gray-600 mb-4">
                Usa software gratis en tu ordenador
              </p>
              <ul className="text-xs space-y-1 text-gray-600">
                <li>✓ Sin límite de tamaño</li>
                <li>✓ Más control</li>
                <li>✓ Software gratis</li>
              </ul>
              <div className="mt-4">
                <span className="badge text-xs bg-green-100 text-green-800">Mejor para archivos muy grandes</span>
              </div>
            </div>

            <div className="option-card border rounded-lg p-6 hover:shadow-lg transition">
              <div className="text-4xl mb-3">🌐</div>
              <h3 className="font-semibold mb-2">Online</h3>
              <p className="text-sm text-gray-600 mb-4">
                Herramienta web sin instalar nada
              </p>
              <ul className="text-xs space-y-1 text-gray-600">
                <li>✓ No instalas nada</li>
                <li>✓ Muy fácil</li>
                <li>⚠ Límite 1-2 GB</li>
              </ul>
              <div className="mt-4">
                <span className="badge text-xs bg-blue-100 text-blue-800">Archivos medianos</span>
              </div>
            </div>
          </div>
        </section>

        {/* Resto del contenido de ayuda... */}
      </div>
    </div>
  );
}
```

---

## 🎯 Herramientas Recomendadas

### Online (Sin Instalación)

| Herramienta | URL | Límite | Calidad | Privacidad | Rating |
|-------------|-----|--------|---------|------------|--------|
| **CloudConvert** | cloudconvert.com | 1 GB gratis/día | Alta | ⚠️ Sube a servidor | ⭐⭐⭐⭐⭐ |
| **Media.io** | media.io | 100 MB | Media-Alta | ⚠️ Sube a servidor | ⭐⭐⭐ |
| **FreeConvert** | freeconvert.com | Ilimitado | Media | ⚠️ Sube a servidor | ⭐⭐⭐ |

### Software Local (Recomendado)

| Software | Plataforma | Facilidad | Calidad | Rating |
|----------|-----------|-----------|---------|--------|
| **VLC Media Player** | Win/Mac/Linux | ⭐⭐⭐⭐⭐ Muy fácil | Alta | ⭐⭐⭐⭐⭐ **MEJOR** |
| **HandBrake** | Win/Mac/Linux | ⭐⭐⭐ Media | Muy Alta | ⭐⭐⭐⭐ |
| **Audacity** | Win/Mac/Linux | ⭐⭐⭐ Media | Alta | ⭐⭐⭐ |
| **FFmpeg** (CLI) | Win/Mac/Linux | ⭐ Difícil | Máxima | ⭐⭐⭐⭐ Avanzado |

### Enlaces Directos

```markdown
## Descargas

**VLC Media Player** (Recomendado)
- Windows: https://www.videolan.org/vlc/download-windows.html
- Mac: https://www.videolan.org/vlc/download-macosx.html
- Linux: https://www.videolan.org/vlc/download-ubuntu.html

**HandBrake**
- Todas las plataformas: https://handbrake.fr/downloads.php

**Online**
- CloudConvert: https://cloudconvert.com/mp4-to-mp3
- Media.io: https://www.media.io/es/video-converter.html
- FreeConvert: https://www.freeconvert.com/video-to-mp3
```

---

## 📊 Métricas y KPIs

### Métricas a Trackear

```typescript
// lib/analytics/video-extraction.ts

export const trackVideoExtractionEvent = (event: {
  action: 'detected' | 'option_selected' | 'extraction_started' | 'extraction_completed' | 'extraction_failed' | 'upload_completed';
  method?: 'auto' | 'manual' | 'already_extracted';
  videoSize?: number;
  audioSize?: number;
  duration?: number;
  error?: string;
}) => {
  // Integrar con tu analytics (Google Analytics, Mixpanel, etc.)
  console.log('[Analytics]', event);

  // Ejemplo con Google Analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', event.action, {
      event_category: 'video_extraction',
      event_label: event.method,
      value: event.videoSize,
    });
  }
};
```

### KPIs de Éxito

```
🎯 OBJETIVO: Conversión 85%+

Métricas primarias:
├─ Videos grandes detectados (por día)
├─ % que elige opción automática
├─ % que elige opción manual
├─ % que ya tiene audio extraído
├─ % que completa el proceso
└─ % que abandona

Métricas secundarias:
├─ Tiempo promedio extracción automática
├─ Tasa de error extracción automática
├─ Videos por tamaño (<1GB, 1-5GB, >5GB)
└─ Satisfacción usuario (NPS)

Métricas técnicas:
├─ Uso de CPU/memoria en browser
├─ Tasa de éxito por navegador
├─ Archivos extraídos vs originales (ratio compresión)
└─ Ahorro de bandwidth (GB/mes)
```

### Dashboard de Métricas

```typescript
// Ejemplo de queries para dashboard admin

SELECT
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE video_size > 200000000) as large_videos_detected,
  COUNT(*) FILTER (WHERE extraction_method = 'auto') as auto_extractions,
  COUNT(*) FILTER (WHERE extraction_method = 'manual') as manual_extractions,
  COUNT(*) FILTER (WHERE extraction_method = 'already_extracted') as already_extracted,
  COUNT(*) FILTER (WHERE status = 'completed') as successful,
  COUNT(*) FILTER (WHERE status = 'abandoned') as abandoned,
  AVG(extraction_duration_seconds) FILTER (WHERE extraction_method = 'auto') as avg_auto_duration,
  AVG(video_size - audio_size) as avg_bandwidth_saved
FROM video_extraction_events
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 💰 Análisis de Costes e Impacto

### Comparativa Antes/Después

```
ESCENARIO: 100 videos de 6 GB/mes

SIN SOLUCIÓN (Actual):
├─ Videos procesables: 0 (todos fallan)
├─ Upload bandwidth: 600 GB × $0.05 = $30 (desperdiciado)
├─ Storage: 600 GB × $0.15 = $90/mes (desperdiciado)
├─ Clientes perdidos: 100
├─ Ingresos perdidos: 100 × €49 = €4,900/mes
└─ COSTE TOTAL: $120 + €4,900 perdidos

CON SOLUCIÓN (Híbrido):
├─ Videos procesables: 85-95 (85-95% conversión)
├─ Upload bandwidth: 90 videos × 230 MB × $0.05/GB = $1
├─ Storage: 90 × 230 MB × $0.15/GB = $3/mes
├─ Transcripción: 90 × 360 min × $0.0025 = $81
├─ Clientes convertidos: 90
├─ Ingresos: 90 × €49 = €4,410/mes
└─ MARGEN NETO: €4,410 - $85 = €4,325/mes

BENEFICIO NETO: +€4,325/mes (+€51,900/año)
```

### ROI de Implementación

```
Inversión:
├─ FASE 1 (Manual): 1 día desarrollo = €500
├─ FASE 2 (Híbrido): 1 semana desarrollo = €2,500
└─ TOTAL: €3,000

Retorno:
├─ Mes 1: €4,325 - €3,000 = €1,325
├─ Mes 2: €4,325
├─ Mes 3: €4,325
└─ Total 3 meses: €13,975

ROI: 465% en 3 meses
Payback period: <1 mes
```

---

## ✅ Checklist de Implementación

### FASE 1: MVP Manual (1 día)

- [ ] **Detección** (1 hora)
  - [ ] Añadir check de tamaño en `FileUploadZone`
  - [ ] Detectar tipo `video/*` y `size > 200MB`
  - [ ] Guardar info del video en estado

- [ ] **Modal** (2 horas)
  - [ ] Crear componente `LargeVideoModal`
  - [ ] Diseño con 2 opciones (manual + ya extraído)
  - [ ] Info del archivo y estimación de audio

- [ ] **Guía** (3 horas)
  - [ ] Crear página `/ayuda/videos-grandes`
  - [ ] Instrucciones VLC paso a paso
  - [ ] Instrucciones CloudConvert
  - [ ] Tabla de calidades de audio

- [ ] **Tip Sidebar** (30 min)
  - [ ] Añadir sección de tips en sidebar
  - [ ] Card con enlace a guía
  - [ ] Opción de cerrar (localStorage)

- [ ] **Testing** (1 hora)
  - [ ] Probar con video >200MB
  - [ ] Verificar enlaces externos
  - [ ] Mobile responsive

### FASE 2: Híbrido con Automático (1 semana)

- [ ] **Setup FFmpeg.wasm** (1 día)
  - [ ] `npm install @ffmpeg/ffmpeg @ffmpeg/util`
  - [ ] Crear componente `AudioExtractor`
  - [ ] Configurar CDN para FFmpeg core
  - [ ] Progress bar y logging

- [ ] **Integración** (1 día)
  - [ ] Añadir opción "Automático" al modal
  - [ ] Routing entre componentes
  - [ ] Handle success/error states
  - [ ] Fallback a manual si falla

- [ ] **UX Polish** (1 día)
  - [ ] Animaciones de transición
  - [ ] Loading states
  - [ ] Error messages claros
  - [ ] Iconos y colores

- [ ] **Testing Exhaustivo** (1 día)
  - [ ] Videos de diferentes tamaños (100MB - 10GB)
  - [ ] Diferentes formatos (MP4, MOV, AVI)
  - [ ] Navegadores (Chrome, Firefox, Safari, Edge)
  - [ ] Mobile (iOS Safari, Chrome Mobile)
  - [ ] Casos edge (errores, cancelación, etc.)

- [ ] **Analytics** (1 día)
  - [ ] Trackear eventos clave
  - [ ] Dashboard de métricas
  - [ ] Alertas si conversión <80%

- [ ] **Documentación** (1 día)
  - [ ] README técnico
  - [ ] Comentarios en código
  - [ ] Guía de troubleshooting
  - [ ] Video demo para usuarios

---

## 🚧 Consideraciones y Limitaciones

### Limitaciones Técnicas

```
FFmpeg.wasm:
├─ Requiere navegador moderno (Chrome 57+, Firefox 52+, Safari 11+)
├─ Consume CPU (puede ser lento en ordenadores antiguos)
├─ Archivos muy grandes (>20 GB) pueden tardar 30+ minutos
└─ Safari iOS tiene límites de memoria más estrictos

Herramientas online:
├─ CloudConvert: 1 GB gratis/día (luego de pago)
├─ Media.io: 100 MB límite gratis
└─ FreeConvert: Ads y conversiones limitadas/día

Consideraciones de privacidad:
├─ Automático (browser): 100% privado, no sale del cliente
├─ Manual (VLC): 100% privado, todo local
└─ Online: ⚠️ Video sube a servidores de terceros
```

### Casos Edge

```
1. Usuario con navegador muy antiguo
   → Solución: Mostrar solo opción manual
   → Detectar con: if (!window.WebAssembly)

2. Video en formato raro (WEBM, MKV, etc.)
   → Solución: FFmpeg.wasm soporta la mayoría
   → Fallback: Instrucciones de conversión primero

3. Ordenador muy lento (extracción tarda >30 min)
   → Solución: Mostrar warning estimado
   → Ofrecer opción manual como alternativa

4. Usuario cancela a mitad de extracción
   → Solución: Confirmar cancelación
   → Limpiar memoria (ffmpeg.terminate())

5. Error de memoria en navegador
   → Solución: Catch error, sugerir manual
   → Log para analytics
```

---

## 📝 Notas Finales

### Próximos Pasos Después de Implementar

1. **Monitorear métricas** primeros 30 días
2. **Recopilar feedback** de usuarios beta
3. **Optimizar** según datos reales
4. **Considerar FASE 3** si demanda existe

### Recursos Adicionales

- **FFmpeg.wasm Docs:** https://ffmpegwasm.netlify.app/
- **VLC CLI Guide:** https://wiki.videolan.org/VLC_command-line_help/
- **HandBrake CLI:** https://handbrake.fr/docs/en/latest/cli/cli-guide.html

### Contacto para Implementación

- **Desarrollador:** [Tu nombre]
- **Fecha documento:** 2025-11-16
- **Versión:** 1.0
- **Estado:** Listo para implementar

---

**Fin del documento**

✅ Guardado en: `docs/SOLUCION-VIDEOS-GRANDES.md`
