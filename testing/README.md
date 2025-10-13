# 🧪 Testing Suite - Annalogica

Suite completa de testing automatizado para Annalogica, con análisis de métricas de rendimiento y calidad.

## 📋 Contenido

```
testing/
├── README.md                   # Esta documentación
├── run-tests.js                # Script principal de ejecución
├── test-runner.ts              # Test runner automatizado
├── quality-analyzer.ts         # Analizador de calidad de transcripciones
├── metrics-dashboard.ts        # Generador de dashboard HTML
├── samples/                    # Archivos de test (MP3, MP4, WAV, etc.)
├── results/                    # Resultados de tests en JSON
└── dashboard.html              # Dashboard visual de métricas
```

## 🚀 Inicio Rápido

### 1. Preparar Archivos de Test

Coloca archivos de audio/video en `./testing/samples/`:

```bash
testing/samples/
├── audio-test-1.mp3
├── audio-test-2.wav
├── video-test-1.mp4
└── document-test-1.pdf
```

**Formatos soportados:**
- Audio: MP3, WAV, M4A
- Video: MP4
- Documentos: PDF, TXT

### 2. Ejecutar Tests

```bash
# Tests básicos en local
node testing/run-tests.js

# Tests con dashboard
node testing/run-tests.js --dashboard

# Tests en producción con análisis detallado
node testing/run-tests.js --env production --analyze
```

### 3. Ver Resultados

Abre `testing/dashboard.html` en tu navegador para ver:
- 📊 Métricas agregadas
- 📈 Tendencias temporales
- 🎯 Análisis por tipo de archivo
- ✅ Historial de sesiones

## 📊 Métricas Que Se Miden

### Rendimiento
- **Tiempo de carga**: Cuánto tarda en subir el archivo
- **Tiempo de procesamiento**: Cuánto tarda la transcripción completa
- **Time Ratio**: Ratio tiempo_procesamiento / duración_audio
  - 🎯 **Objetivo**: 0.15-0.20x (15-20% de la duración real)
  - ⚡ Ejemplo: Audio de 10min → procesamiento en 1.5-2min

### Calidad
- **Calidad de transcripción**: Precisión del texto transcrito
  - 🎯 **Objetivo**: >95%
  - Métricas: WER, CER, similitud semántica

- **Calidad de diarización**: Precisión en detección de hablantes
  - 🎯 **Objetivo**: >90%
  - Métricas: Número de hablantes, transiciones, segmentación

### Outputs
- ✅ Transcripción (TXT)
- ✅ Subtítulos (SRT, VTT)
- ✅ PDF exportable
- ✅ Resumen con IA
- ✅ Detección de hablantes
- ✅ Tags automáticos

## 🔧 Uso Avanzado

### Tests Personalizados

Crea un archivo de configuración `test-config.json`:

```json
{
  "testFiles": [
    {
      "name": "entrevista-2-personas.mp3",
      "path": "./testing/samples/entrevista-2-personas.mp3",
      "type": "audio",
      "format": "mp3",
      "duration": 1800,
      "expectedSpeakers": 2
    }
  ],
  "expectedMetrics": {
    "minTranscriptionQuality": 95,
    "minDiarizationQuality": 90,
    "maxTimeRatio": 0.20
  }
}
```

### Comparación con Transcripción de Referencia

Si tienes una transcripción manual de referencia:

```typescript
import QualityAnalyzer from './quality-analyzer';

const analyzer = new QualityAnalyzer();
const reference = "Transcripción manual correcta...";
const transcription = "Transcripción generada por IA...";

const comparison = analyzer.compareWithReference(transcription, reference);
console.log(`Precisión: ${comparison.accuracy}%`);
console.log(`WER: ${comparison.wordErrorRate}%`);
```

### Generar Reporte de Calidad

```typescript
import QualityAnalyzer from './quality-analyzer';

const analyzer = new QualityAnalyzer();
const report = analyzer.generateQualityReport(
  transcription,
  speakers,
  summary,
  reference // opcional
);

console.log(report);
```

## 📈 Dashboard de Métricas

El dashboard HTML incluye:

### Vista General
- Tests totales ejecutados
- Tasa de éxito/fallo
- Tiempos promedio (carga y procesamiento)
- Calidad promedio (transcripción y diarización)

### Gráficos
- **Timeline**: Evolución de calidad en los últimos 30 días
- **Distribución**: Tests por tipo de archivo
- **Comparación**: Rendimiento entre formatos

### Sesiones
- Historial de todas las sesiones de testing
- Detalles por sesión (fecha, tests, resultados)

## 🎯 Objetivos de Calidad

### Modelos IA Utilizados

**AssemblyAI Universal-1** (Transcripción)
- ✅ Uno de los mejores modelos del mercado
- ✅ Superior a Whisper en diarización
- ✅ Coste: $0.25/hora de audio
- ✅ Ventajas: Mejor detección de hablantes, API estable

**Claude 3.7 Sonnet** (Resúmenes)
- ✅ Modelo más avanzado de Anthropic
- ✅ Excelente comprensión en español
- ✅ 200K tokens de contexto
- ✅ Coste: $3/M input, $15/M output

### Benchmarks Esperados

| Métrica | Objetivo | Excelente |
|---------|----------|-----------|
| Time Ratio | 0.15-0.20x | <0.15x |
| Transcripción | >95% | >98% |
| Diarización | >90% | >95% |
| Tiempo de carga | <5s | <2s |

## 🔍 Tipos de Tests

### 1. Tests de Rendimiento
- Tiempo de carga de diferentes tamaños de archivo
- Tiempo de procesamiento según duración
- Carga simultánea de múltiples archivos

### 2. Tests de Calidad
- Precisión de transcripción (comparación con referencia)
- Calidad de diarización (número de hablantes)
- Calidad de resúmenes (cobertura de puntos clave)

### 3. Tests de Formatos
- MP3, MP4, WAV, M4A
- Diferentes bitrates y calidades
- Documentos PDF y TXT

### 4. Tests Especiales
- Múltiples hablantes (2-10 personas)
- Audio con ruido de fondo
- Acentos y dialectos diferentes
- Audio largo (>1 hora)

## 🛠️ API de Testing

### TestRunner

```typescript
import TestRunner from './test-runner';

const runner = new TestRunner('local'); // o 'production'

// Autenticar
await runner.authenticate('email@example.com', 'password');

// Ejecutar test de un archivo
const result = await runner.testFile({
  name: 'test.mp3',
  path: './samples/test.mp3',
  type: 'audio',
  format: 'mp3',
  duration: 120,
  expectedSpeakers: 2
});

// Ejecutar suite completa
const session = await runner.runTestSuite(testFiles);
```

### QualityAnalyzer

```typescript
import QualityAnalyzer from './quality-analyzer';

const analyzer = new QualityAnalyzer();

// Analizar transcripción
const metrics = analyzer.analyzeTranscription(transcription);

// Comparar con referencia
const comparison = analyzer.compareWithReference(transcription, reference);

// Analizar hablantes
const speakers = analyzer.analyzeSpeakers(speakersData);

// Analizar resumen
const summary = analyzer.analyzeSummary(summary, originalText);

// Generar reporte completo
const report = analyzer.generateQualityReport(
  transcription,
  speakers,
  summary,
  reference
);
```

### MetricsDashboard

```typescript
import MetricsDashboard from './metrics-dashboard';

const dashboard = new MetricsDashboard();

// Generar dashboard HTML
dashboard.generate();

// Se crea ./testing/dashboard.html
```

## 📝 Formato de Resultados

Cada test genera un resultado JSON en `./testing/results/`:

```json
{
  "sessionId": "test-1234567890",
  "startTime": "2025-10-13T10:30:00Z",
  "endTime": "2025-10-13T10:45:00Z",
  "environment": "local",
  "results": [
    {
      "fileName": "audio-test-1.mp3",
      "fileType": "mp3",
      "fileSize": 2048000,
      "uploadTime": 1234,
      "processingTime": 15000,
      "totalTime": 16234,
      "timeRatio": 0.18,
      "transcriptionQuality": 96.5,
      "diarizationQuality": 92.3,
      "outputs": {
        "txt": true,
        "srt": true,
        "vtt": true,
        "pdf": true,
        "summary": true,
        "speakers": true,
        "tags": true
      },
      "errors": [],
      "warnings": [],
      "timestamp": "2025-10-13T10:30:15Z"
    }
  ],
  "summary": {
    "totalTests": 5,
    "passed": 5,
    "failed": 0,
    "averageUploadTime": 1200,
    "averageProcessingTime": 14500,
    "averageTimeRatio": 0.19,
    "averageTranscriptionQuality": 96.2,
    "averageDiarizationQuality": 91.8
  }
}
```

## 🐛 Troubleshooting

### Error: "No autenticado"
```bash
# Asegúrate de pasar credenciales correctas
node testing/run-tests.js --email test@example.com --password mypass
```

### Error: "No se encontraron archivos de test"
```bash
# Verifica que existan archivos en ./testing/samples/
ls testing/samples/
```

### Error: "TypeScript not compiled"
```bash
# Compila manualmente los archivos TS
npx tsc testing/*.ts --lib es2015,dom --target es2015
```

### Dashboard no muestra datos
```bash
# Verifica que existan resultados previos
ls testing/results/

# Ejecuta tests primero si no hay resultados
node testing/run-tests.js
```

## 📚 Recursos

- [Documentación AssemblyAI](https://www.assemblyai.com/docs)
- [Documentación Claude API](https://docs.anthropic.com)
- [Guía de Testing](./TESTING-GUIDE.md)

## 🤝 Contribuir

Para agregar nuevos tipos de tests:

1. Crear función de test en `test-runner.ts`
2. Agregar métricas en `quality-analyzer.ts`
3. Actualizar dashboard en `metrics-dashboard.ts`
4. Documentar en este README

## 📄 Licencia

© 2025 Annalogica - Todos los derechos reservados
