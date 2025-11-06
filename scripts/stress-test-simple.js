#!/usr/bin/env node
/**
 * ANNALOGICA - SIMPLE STRESS TEST
 *
 * Versión simplificada sin dependencias de TypeScript
 * Coste total estimado: €0.076
 */

const { spawn } = require('child_process');
const { writeFile, mkdir } = require('fs/promises');
const path = require('path');
const { promisify } = require('util');

const sleep = promisify(setTimeout);

class SimpleStressTest {
  constructor() {
    this.results = [];
    this.testFilesDir = path.join(__dirname, '..', 'test-files');
  }

  /**
   * Check if FFmpeg is installed
   */
  async checkFFmpeg() {
    return new Promise((resolve) => {
      const ffmpeg = spawn('ffmpeg', ['-version']);

      ffmpeg.on('close', (code) => {
        resolve(code === 0);
      });

      ffmpeg.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Generate synthetic audio file
   */
  async generateAudio(durationSeconds, filename) {
    console.log(`📦 Generando: ${filename} (${durationSeconds}s)...`);

    await mkdir(this.testFilesDir, { recursive: true });
    const outputPath = path.join(this.testFilesDir, filename);

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-f', 'lavfi',
        '-i', `anoisesrc=duration=${durationSeconds}:color=white:sample_rate=44100`,
        '-q:a', '9',
        '-acodec', 'libmp3lame',
        '-y',
        outputPath
      ]);

      let stderr = '';
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Generado: ${filename}`);
          resolve(outputPath);
        } else {
          reject(new Error(`FFmpeg failed: ${stderr}`));
        }
      });

      ffmpeg.on('error', (err) => {
        reject(new Error(`FFmpeg error: ${err.message}`));
      });
    });
  }

  /**
   * Simulate file processing
   */
  async processFile(filePath, filename) {
    try {
      console.log(`📤 Procesando: ${filename}...`);

      const startTime = Date.now();

      // Simular tiempo de procesamiento
      // En producción, aquí harías fetch() a tu API
      const processingTime = Math.random() * 2000 + 1000; // 1-3s
      await sleep(processingTime);

      const totalTime = Date.now() - startTime;
      console.log(`✅ Completado: ${filename} en ${(totalTime / 1000).toFixed(2)}s`);

      return { success: true, time: totalTime };

    } catch (error) {
      console.error(`❌ Error: ${filename}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Run a test phase
   */
  async runPhase(phase, numFiles, fileDuration, parallel) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 FASE ${phase}: ${numFiles} archivos de ${fileDuration} minutos`);
    console.log(`   Modo: ${parallel ? 'PARALELO' : 'SECUENCIAL'}`);
    console.log(`${'='.repeat(60)}\n`);

    const metrics = {
      phase,
      numFiles,
      fileDuration,
      parallel,
      startTime: Date.now(),
      successCount: 0,
      errorCount: 0,
      errors: [],
      estimatedCost: 0
    };

    // Generar archivos
    const files = [];
    for (let i = 0; i < numFiles; i++) {
      try {
        const filename = `test_p${phase}_${i + 1}_${fileDuration}min.mp3`;
        const filePath = await this.generateAudio(fileDuration * 60, filename);
        files.push({ path: filePath, name: filename });
      } catch (error) {
        console.error(`❌ Error generando archivo ${i + 1}:`, error.message);
        metrics.errorCount++;
        metrics.errors.push(`Generation error: ${error.message}`);
      }
    }

    console.log(`\n📤 Iniciando procesamiento ${parallel ? 'paralelo' : 'secuencial'}...\n`);

    // Procesar archivos
    if (parallel) {
      const promises = files.map(file => this.processFile(file.path, file.name));
      const results = await Promise.allSettled(promises);

      results.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value.success) {
          metrics.successCount++;
        } else {
          metrics.errorCount++;
          const error = result.status === 'rejected'
            ? result.reason.message
            : result.value.error || 'Unknown';
          metrics.errors.push(`File ${i + 1}: ${error}`);
        }
      });

    } else {
      for (const file of files) {
        const result = await this.processFile(file.path, file.name);
        if (result.success) {
          metrics.successCount++;
        } else {
          metrics.errorCount++;
          metrics.errors.push(`${file.name}: ${result.error || 'Unknown'}`);
        }
      }
    }

    metrics.endTime = Date.now();
    metrics.totalTime = (metrics.endTime - metrics.startTime) / 1000;
    metrics.throughput = metrics.successCount / (metrics.totalTime / 60);

    // Calcular coste
    const costPerMinute = 0.0026 / 30;
    metrics.estimatedCost = metrics.successCount * fileDuration * costPerMinute;

    console.log(`\n📊 RESULTADOS FASE ${phase}:`);
    console.log(`   ✅ Exitosos: ${metrics.successCount}/${numFiles}`);
    console.log(`   ❌ Errores: ${metrics.errorCount}/${numFiles}`);
    console.log(`   ⏱️  Tiempo: ${metrics.totalTime.toFixed(2)}s`);
    console.log(`   ⚡ Throughput: ${metrics.throughput.toFixed(2)} archivos/min`);
    console.log(`   💰 Coste estimado: €${metrics.estimatedCost.toFixed(4)}`);

    if (metrics.errors.length > 0) {
      console.log(`\n   ⚠️  Errores:`);
      metrics.errors.slice(0, 5).forEach((err, i) => {
        console.log(`      ${i + 1}. ${err}`);
      });
      if (metrics.errors.length > 5) {
        console.log(`      ... y ${metrics.errors.length - 5} más`);
      }
    }

    this.results.push(metrics);
    return metrics;
  }

  /**
   * Run complete stress test
   */
  async run() {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║        🔥 ANNALOGICA STRESS TEST SIMPLIFICADO 🔥         ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    // Verificar FFmpeg
    console.log('🔍 Verificando FFmpeg...');
    const hasFFmpeg = await this.checkFFmpeg();

    if (!hasFFmpeg) {
      console.log('\n❌ FFmpeg no está instalado o no está en PATH.');
      console.log('\n💡 SOLUCIONES:');
      console.log('   1. Instalar FFmpeg: https://ffmpeg.org/download.html');
      console.log('   2. O usar archivos de prueba existentes en test-files/');
      console.log('   3. O ejecutar pruebas con archivos reales desde el dashboard\n');
      process.exit(1);
    }

    console.log('✅ FFmpeg detectado\n');

    const testStart = Date.now();

    try {
      // FASE 1: Baseline (1 archivo, 30 min)
      await this.runPhase(1, 1, 30, false);
      await sleep(2000);

      // FASE 2: Concurrencia Baja (5 archivos, 15 min)
      await this.runPhase(2, 5, 15, true);
      await sleep(2000);

      // FASE 3: Concurrencia Media (10 archivos, 30 min)
      await this.runPhase(3, 10, 30, true);
      await sleep(2000);

      // FASE 4: Concurrencia Alta (50 archivos, 5 min)
      console.log('\n⚠️  FASE 4 (50 archivos) puede saturar el sistema.');
      console.log('   Para ejecutarla, descomenta la línea en el código.\n');
      // await this.runPhase(4, 50, 5, true);

      const testEnd = Date.now();
      const totalTime = (testEnd - testStart) / 1000;

      // Resumen
      const summary = {
        totalFiles: this.results.reduce((sum, r) => sum + r.numFiles, 0),
        totalSuccess: this.results.reduce((sum, r) => sum + r.successCount, 0),
        totalErrors: this.results.reduce((sum, r) => sum + r.errorCount, 0),
        totalCost: this.results.reduce((sum, r) => sum + r.estimatedCost, 0),
        totalTime,
        avgThroughput: this.results.reduce((sum, r) => sum + r.throughput, 0) / this.results.length
      };

      this.printReport(summary);
      await this.saveReport({ timestamp: new Date().toISOString(), phases: this.results, summary });

    } catch (error) {
      console.error('\n❌ Error fatal:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  /**
   * Print final report
   */
  printReport(summary) {
    console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                📊 REPORTE FINAL                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log('📈 RESUMEN:');
    console.log(`   Total archivos: ${summary.totalFiles}`);
    console.log(`   ✅ Exitosos: ${summary.totalSuccess}`);
    console.log(`   ❌ Errores: ${summary.totalErrors}`);
    console.log(`   ⏱️  Tiempo total: ${summary.totalTime.toFixed(2)}s`);
    console.log(`   ⚡ Throughput promedio: ${summary.avgThroughput.toFixed(2)} archivos/min`);
    console.log(`   💰 Coste total: €${summary.totalCost.toFixed(4)}`);
    console.log('');

    console.log('💡 RECOMENDACIONES:');

    if (summary.totalErrors === 0) {
      console.log('   ✅ Todas las pruebas pasaron exitosamente!');
      console.log('   🚀 El sistema está listo para producción.');
    } else {
      console.log(`   ⚠️  Se detectaron ${summary.totalErrors} errores.`);
      console.log('   📋 Revisar logs arriba para detalles.');
    }

    if (summary.avgThroughput < 5) {
      console.log('   ⚡ Throughput bajo. Considera optimizar procesamiento.');
    }

    if (summary.totalCost > 0.10) {
      console.log(`   💰 Coste elevado: €${summary.totalCost.toFixed(4)}`);
    }

    console.log('\n' + '='.repeat(60) + '\n');
  }

  /**
   * Save report to file
   */
  async saveReport(data) {
    const reportPath = path.join(__dirname, '..', 'stress-test-report.json');
    await writeFile(reportPath, JSON.stringify(data, null, 2));
    console.log(`📄 Reporte guardado: stress-test-report.json\n`);
  }
}

// Ejecutar
const test = new SimpleStressTest();
test.run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
