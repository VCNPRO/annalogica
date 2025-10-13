/**
 * Script de Testing Automatizado - Annalogica
 *
 * Mide métricas de rendimiento y calidad:
 * - Tiempos de carga
 * - Tiempos de procesamiento
 * - Calidad de transcripción
 * - Diarización de hablantes
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Tipos
interface TestFile {
  name: string;
  path: string;
  type: 'audio' | 'video' | 'document';
  format: string;
  duration?: number; // en segundos (solo para audio/video)
  expectedSpeakers?: number;
}

interface TestResult {
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadTime: number;
  processingTime: number;
  totalTime: number;
  timeRatio?: number; // processingTime / duration (solo audio/video)
  transcriptionQuality?: number; // % de precisión
  diarizationQuality?: number; // % de precisión en detección de hablantes
  outputs: {
    txt?: boolean;
    srt?: boolean;
    vtt?: boolean;
    pdf?: boolean;
    summary?: boolean;
    speakers?: boolean;
    tags?: boolean;
  };
  errors: string[];
  warnings: string[];
  timestamp: string;
}

interface TestSession {
  sessionId: string;
  startTime: string;
  endTime?: string;
  environment: 'local' | 'production';
  results: TestResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    averageUploadTime: number;
    averageProcessingTime: number;
    averageTimeRatio: number;
    averageTranscriptionQuality: number;
    averageDiarizationQuality: number;
  };
}

class TestRunner {
  private session: TestSession;
  private baseUrl: string;
  private authToken?: string;

  constructor(environment: 'local' | 'production' = 'local') {
    this.baseUrl = environment === 'local'
      ? 'http://localhost:3000'
      : 'https://annalogica.vercel.app';

    this.session = {
      sessionId: `test-${Date.now()}`,
      startTime: new Date().toISOString(),
      environment,
      results: [],
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        averageUploadTime: 0,
        averageProcessingTime: 0,
        averageTimeRatio: 0,
        averageTranscriptionQuality: 0,
        averageDiarizationQuality: 0,
      }
    };

    // Crear directorio de resultados si no existe
    if (!existsSync('./testing/results')) {
      mkdirSync('./testing/results', { recursive: true });
    }
  }

  /**
   * Autenticar para obtener token JWT
   */
  async authenticate(email: string, password: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data = await response.json();
        this.authToken = data.token;
        console.log('✅ Autenticación exitosa');
        return true;
      }

      console.error('❌ Error en autenticación:', response.status);
      return false;
    } catch (error) {
      console.error('❌ Error al autenticar:', error);
      return false;
    }
  }

  /**
   * Subir archivo y medir tiempo de carga
   */
  async uploadFile(file: TestFile): Promise<{ uploadTime: number; jobId?: string; error?: string }> {
    const startTime = Date.now();

    try {
      if (!this.authToken) {
        throw new Error('No autenticado. Llamar a authenticate() primero.');
      }

      const fileBuffer = readFileSync(file.path);
      const formData = new FormData();
      const blob = new Blob([fileBuffer], { type: this.getMimeType(file.format) });
      formData.append('file', blob, file.name);

      const response = await fetch(`${this.baseUrl}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        },
        body: formData
      });

      const uploadTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        return { uploadTime, jobId: data.jobId };
      }

      return { uploadTime, error: `HTTP ${response.status}` };
    } catch (error) {
      const uploadTime = Date.now() - startTime;
      return { uploadTime, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Monitorear procesamiento y medir tiempo
   */
  async monitorProcessing(jobId: string, maxWaitTime: number = 600000): Promise<{
    processingTime: number;
    status: string;
    outputs?: any;
    error?: string;
  }> {
    const startTime = Date.now();
    let lastStatus = '';

    try {
      while (Date.now() - startTime < maxWaitTime) {
        const response = await fetch(`${this.baseUrl}/api/jobs/${jobId}`, {
          headers: { 'Authorization': `Bearer ${this.authToken}` }
        });

        if (!response.ok) {
          return {
            processingTime: Date.now() - startTime,
            status: 'error',
            error: `HTTP ${response.status}`
          };
        }

        const data = await response.json();

        if (data.status !== lastStatus) {
          console.log(`   Status: ${data.status}`);
          lastStatus = data.status;
        }

        if (data.status === 'completed') {
          return {
            processingTime: Date.now() - startTime,
            status: 'completed',
            outputs: data.outputs
          };
        }

        if (data.status === 'failed') {
          return {
            processingTime: Date.now() - startTime,
            status: 'failed',
            error: data.error || 'Processing failed'
          };
        }

        // Esperar 2 segundos antes del siguiente poll
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      return {
        processingTime: Date.now() - startTime,
        status: 'timeout',
        error: 'Max wait time exceeded'
      };
    } catch (error) {
      return {
        processingTime: Date.now() - startTime,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Analizar calidad de transcripción (comparando con referencia si existe)
   */
  analyzeTranscriptionQuality(transcription: string, reference?: string): number {
    if (!reference) {
      // Sin referencia, solo verificar que no esté vacío y tenga contenido válido
      if (!transcription || transcription.trim().length < 10) {
        return 0;
      }
      // Heurística simple: longitud razonable, puntuación, palabras
      const words = transcription.split(/\s+/).length;
      const hasPunctuation = /[.,;:!?]/.test(transcription);
      const hasCapitals = /[A-Z]/.test(transcription);

      let score = 60; // base
      if (words > 50) score += 20;
      if (hasPunctuation) score += 10;
      if (hasCapitals) score += 10;

      return Math.min(score, 100);
    }

    // Con referencia: calcular similitud (Levenshtein simplificado)
    // Nota: Para producción, usar librería como 'string-similarity'
    const similarity = this.calculateSimilarity(transcription, reference);
    return similarity * 100;
  }

  /**
   * Analizar calidad de diarización (detección de hablantes)
   */
  analyzeDiarizationQuality(speakers: any[], expectedSpeakers?: number): number {
    if (!speakers || speakers.length === 0) {
      return 0;
    }

    if (!expectedSpeakers) {
      // Sin expectativa, verificar que tenga datos válidos
      const hasValidData = speakers.every(s =>
        s.name && s.duration && s.segments && s.segments.length > 0
      );
      return hasValidData ? 80 : 50;
    }

    // Con expectativa: comparar número de hablantes detectados
    const detectedCount = speakers.length;
    const accuracy = 1 - Math.abs(detectedCount - expectedSpeakers) / expectedSpeakers;
    return Math.max(0, accuracy * 100);
  }

  /**
   * Ejecutar test de un archivo
   */
  async testFile(file: TestFile): Promise<TestResult> {
    console.log(`\n🧪 Testing: ${file.name}`);
    console.log(`   Tipo: ${file.type} (${file.format})`);
    if (file.duration) {
      console.log(`   Duración: ${file.duration}s`);
    }

    const result: TestResult = {
      fileName: file.name,
      fileType: file.format,
      fileSize: existsSync(file.path) ? readFileSync(file.path).length : 0,
      uploadTime: 0,
      processingTime: 0,
      totalTime: 0,
      outputs: {},
      errors: [],
      warnings: [],
      timestamp: new Date().toISOString()
    };

    try {
      // 1. Upload
      console.log('   📤 Subiendo archivo...');
      const uploadResult = await this.uploadFile(file);
      result.uploadTime = uploadResult.uploadTime;
      console.log(`   ✅ Uploaded en ${uploadResult.uploadTime}ms`);

      if (uploadResult.error || !uploadResult.jobId) {
        result.errors.push(uploadResult.error || 'No job ID returned');
        return result;
      }

      // 2. Processing
      console.log('   ⚙️  Procesando...');
      const processingResult = await this.monitorProcessing(uploadResult.jobId);
      result.processingTime = processingResult.processingTime;
      result.totalTime = result.uploadTime + result.processingTime;

      if (file.duration) {
        result.timeRatio = result.processingTime / 1000 / file.duration;
        console.log(`   ⏱️  Time ratio: ${result.timeRatio.toFixed(2)}x`);
      }

      if (processingResult.error) {
        result.errors.push(processingResult.error);
        return result;
      }

      // 3. Verificar outputs
      if (processingResult.outputs) {
        const outputs = processingResult.outputs;
        result.outputs = {
          txt: !!outputs.transcription,
          srt: !!outputs.srt,
          vtt: !!outputs.vtt,
          pdf: !!outputs.pdf,
          summary: !!outputs.summary,
          speakers: !!outputs.speakers,
          tags: !!outputs.tags
        };

        // 4. Analizar calidad
        if (outputs.transcription) {
          result.transcriptionQuality = this.analyzeTranscriptionQuality(outputs.transcription);
          console.log(`   📝 Calidad transcripción: ${result.transcriptionQuality.toFixed(1)}%`);
        }

        if (outputs.speakers) {
          result.diarizationQuality = this.analyzeDiarizationQuality(
            outputs.speakers,
            file.expectedSpeakers
          );
          console.log(`   🎤 Calidad diarización: ${result.diarizationQuality.toFixed(1)}%`);
        }
      }

      console.log(`   ✅ Test completado en ${result.totalTime}ms`);
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      console.error(`   ❌ Error: ${result.errors[0]}`);
    }

    return result;
  }

  /**
   * Ejecutar suite completa de tests
   */
  async runTestSuite(files: TestFile[]): Promise<TestSession> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Iniciando Test Suite - ${this.session.environment}`);
    console.log(`${'='.repeat(60)}`);

    for (const file of files) {
      const result = await this.testFile(file);
      this.session.results.push(result);
    }

    this.calculateSummary();
    this.session.endTime = new Date().toISOString();
    this.saveResults();
    this.printSummary();

    return this.session;
  }

  /**
   * Calcular resumen de resultados
   */
  private calculateSummary() {
    const results = this.session.results;
    const summary = this.session.summary;

    summary.totalTests = results.length;
    summary.passed = results.filter(r => r.errors.length === 0).length;
    summary.failed = summary.totalTests - summary.passed;

    if (results.length > 0) {
      summary.averageUploadTime =
        results.reduce((sum, r) => sum + r.uploadTime, 0) / results.length;

      summary.averageProcessingTime =
        results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;

      const timeRatios = results.filter(r => r.timeRatio);
      if (timeRatios.length > 0) {
        summary.averageTimeRatio =
          timeRatios.reduce((sum, r) => sum + (r.timeRatio || 0), 0) / timeRatios.length;
      }

      const transcriptions = results.filter(r => r.transcriptionQuality);
      if (transcriptions.length > 0) {
        summary.averageTranscriptionQuality =
          transcriptions.reduce((sum, r) => sum + (r.transcriptionQuality || 0), 0) / transcriptions.length;
      }

      const diarizations = results.filter(r => r.diarizationQuality);
      if (diarizations.length > 0) {
        summary.averageDiarizationQuality =
          diarizations.reduce((sum, r) => sum + (r.diarizationQuality || 0), 0) / diarizations.length;
      }
    }
  }

  /**
   * Guardar resultados en archivo JSON
   */
  private saveResults() {
    const filename = `./testing/results/${this.session.sessionId}.json`;
    writeFileSync(filename, JSON.stringify(this.session, null, 2));
    console.log(`\n💾 Resultados guardados en: ${filename}`);
  }

  /**
   * Imprimir resumen en consola
   */
  private printSummary() {
    const s = this.session.summary;

    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 RESUMEN DE TESTS');
    console.log(`${'='.repeat(60)}`);
    console.log(`Total tests: ${s.totalTests}`);
    console.log(`✅ Pasados: ${s.passed}`);
    console.log(`❌ Fallados: ${s.failed}`);
    console.log(`\n⏱️  TIEMPOS PROMEDIO:`);
    console.log(`   Upload: ${s.averageUploadTime.toFixed(0)}ms`);
    console.log(`   Processing: ${s.averageProcessingTime.toFixed(0)}ms`);
    if (s.averageTimeRatio > 0) {
      console.log(`   Time Ratio: ${s.averageTimeRatio.toFixed(2)}x (objetivo: 0.15-0.20x)`);
    }
    console.log(`\n📈 CALIDAD PROMEDIO:`);
    if (s.averageTranscriptionQuality > 0) {
      console.log(`   Transcripción: ${s.averageTranscriptionQuality.toFixed(1)}% (objetivo: >95%)`);
    }
    if (s.averageDiarizationQuality > 0) {
      console.log(`   Diarización: ${s.averageDiarizationQuality.toFixed(1)}% (objetivo: >90%)`);
    }
    console.log(`${'='.repeat(60)}\n`);
  }

  // Utilidades
  private getMimeType(format: string): string {
    const types: Record<string, string> = {
      mp3: 'audio/mpeg',
      mp4: 'video/mp4',
      wav: 'audio/wav',
      m4a: 'audio/mp4',
      pdf: 'application/pdf',
      txt: 'text/plain'
    };
    return types[format.toLowerCase()] || 'application/octet-stream';
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Implementación simple de similitud (Jaccard)
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }
}

// Ejemplo de uso
export async function runTests() {
  const runner = new TestRunner('local'); // o 'production'

  // Autenticar
  const authenticated = await runner.authenticate('test@example.com', 'password');
  if (!authenticated) {
    console.error('No se pudo autenticar');
    return;
  }

  // Definir archivos de test
  const testFiles: TestFile[] = [
    {
      name: 'audio-test-1.mp3',
      path: './testing/samples/audio-test-1.mp3',
      type: 'audio',
      format: 'mp3',
      duration: 120, // 2 minutos
      expectedSpeakers: 2
    },
    {
      name: 'video-test-1.mp4',
      path: './testing/samples/video-test-1.mp4',
      type: 'video',
      format: 'mp4',
      duration: 300, // 5 minutos
      expectedSpeakers: 3
    },
    // Agregar más archivos de test...
  ];

  // Ejecutar tests
  await runner.runTestSuite(testFiles);
}

// Si se ejecuta directamente
if (require.main === module) {
  runTests().catch(console.error);
}

export default TestRunner;
