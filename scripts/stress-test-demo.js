#!/usr/bin/env node
/**
 * ANNALOGICA - STRESS TEST DEMO
 * Versión de demostración que simula el proceso sin FFmpeg
 */

const { promisify } = require('util');
const { writeFile } = require('fs/promises');
const path = require('path');

const sleep = promisify(setTimeout);

class DemoStressTest {
  constructor() {
    this.results = [];
  }

  /**
   * Simular procesamiento de archivo
   */
  async processFile(filename, durationMin) {
    try {
      const startTime = Date.now();

      // Simular tiempo de procesamiento basado en duración
      // Whisper procesa a ~0.05-0.1x tiempo real
      const processingTimeMs = (durationMin * 60 * 0.08) * 1000; // 0.08x tiempo real
      const randomVariation = Math.random() * 500 + 500; // 0.5-1s variación
      const totalTime = processingTimeMs + randomVariation;

      await sleep(totalTime);

      const elapsed = Date.now() - startTime;

      // Simular éxito/error (95% éxito)
      const success = Math.random() > 0.05;

      if (success) {
        console.log(`   ✅ ${filename}: ${(elapsed / 1000).toFixed(2)}s`);
        return { success: true, time: elapsed };
      } else {
        console.log(`   ❌ ${filename}: Error simulado`);
        return { success: false, error: 'Simulated random error' };
      }

    } catch (error) {
      console.error(`   ❌ ${filename}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Ejecutar fase de prueba
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

    console.log(`📤 Procesando ${numFiles} archivos (simulado)...\n`);

    const files = [];
    for (let i = 0; i < numFiles; i++) {
      files.push({
        name: `archivo_${phase}_${i + 1}.mp3`,
        duration: fileDuration
      });
    }

    // Procesar archivos
    if (parallel) {
      const promises = files.map(file =>
        this.processFile(file.name, file.duration)
      );

      const results = await Promise.allSettled(promises);

      results.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value.success) {
          metrics.successCount++;
        } else {
          metrics.errorCount++;
          const error = result.status === 'rejected'
            ? result.reason.message
            : result.value.error || 'Unknown';
          metrics.errors.push(`${files[i].name}: ${error}`);
        }
      });

    } else {
      for (const file of files) {
        const result = await this.processFile(file.name, file.duration);
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

    // Calcular coste (€0.0026 por 30min)
    const costPerMinute = 0.0026 / 30;
    metrics.estimatedCost = metrics.successCount * fileDuration * costPerMinute;

    console.log(`\n📊 RESULTADOS FASE ${phase}:`);
    console.log(`   ✅ Exitosos: ${metrics.successCount}/${numFiles}`);
    console.log(`   ❌ Errores: ${metrics.errorCount}/${numFiles}`);
    console.log(`   ⏱️  Tiempo: ${metrics.totalTime.toFixed(2)}s`);
    console.log(`   ⚡ Throughput: ${metrics.throughput.toFixed(2)} archivos/min`);
    console.log(`   💰 Coste estimado: €${metrics.estimatedCost.toFixed(4)}`);

    if (metrics.errors.length > 0) {
      console.log(`\n   ⚠️  Errores detectados:`);
      metrics.errors.forEach((err, i) => {
        console.log(`      ${i + 1}. ${err}`);
      });
    }

    this.results.push(metrics);
    return metrics;
  }

  /**
   * Ejecutar suite completa
   */
  async run() {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║      🔥 ANNALOGICA STRESS TEST - DEMO MODE 🔥            ║');
    console.log('║         (Simulación sin archivos reales)                  ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log('ℹ️  Modo DEMO: Simula procesamiento sin generar archivos');
    console.log('   Para pruebas reales con archivos: instalar FFmpeg\n');

    const testStart = Date.now();

    try {
      // FASE 1: Baseline
      await this.runPhase(1, 1, 30, false);
      await sleep(1000);

      // FASE 2: Concurrencia Baja
      await this.runPhase(2, 5, 15, true);
      await sleep(1000);

      // FASE 3: Concurrencia Media
      await this.runPhase(3, 10, 30, true);
      await sleep(1000);

      // FASE 4: Opcional
      console.log('\n⚠️  FASE 4 (50 archivos) omitida en modo demo.');
      console.log('   Para ejecutarla, usar modo completo con FFmpeg.\n');

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
      await this.saveReport({
        timestamp: new Date().toISOString(),
        mode: 'demo',
        phases: this.results,
        summary
      });

    } catch (error) {
      console.error('\n❌ Error fatal:', error.message);
      process.exit(1);
    }
  }

  /**
   * Imprimir reporte final
   */
  printReport(summary) {
    console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║              📊 REPORTE FINAL - DEMO MODE                ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log('📈 RESUMEN GENERAL:');
    console.log(`   Total archivos procesados: ${summary.totalFiles}`);
    console.log(`   ✅ Exitosos: ${summary.totalSuccess}`);
    console.log(`   ❌ Errores: ${summary.totalErrors}`);
    console.log(`   ⏱️  Tiempo total: ${summary.totalTime.toFixed(2)}s`);
    console.log(`   ⚡ Throughput promedio: ${summary.avgThroughput.toFixed(2)} archivos/min`);
    console.log(`   💰 Coste total estimado: €${summary.totalCost.toFixed(4)}`);
    console.log('');

    console.log('📊 RESULTADOS POR FASE:');
    this.results.forEach(phase => {
      const successRate = ((phase.successCount / phase.numFiles) * 100).toFixed(1);
      console.log(`\n   Fase ${phase.phase}: ${phase.numFiles} archivos × ${phase.fileDuration}min`);
      console.log(`      ✅ Éxito: ${phase.successCount}/${phase.numFiles} (${successRate}%)`);
      console.log(`      ⏱️  Tiempo: ${phase.totalTime?.toFixed(2)}s`);
      console.log(`      ⚡ Throughput: ${phase.throughput?.toFixed(2)} archivos/min`);
      console.log(`      💰 Coste: €${phase.estimatedCost.toFixed(4)}`);
    });

    console.log('\n\n💡 ANÁLISIS Y RECOMENDACIONES:\n');

    const successRate = (summary.totalSuccess / summary.totalFiles) * 100;

    if (successRate >= 95) {
      console.log('   ✅ Tasa de éxito excelente (≥95%)');
      console.log('   🚀 El sistema está listo para producción');
    } else if (successRate >= 90) {
      console.log('   ⚠️  Tasa de éxito aceptable (90-95%)');
      console.log('   📋 Revisar causas de errores ocasionales');
    } else {
      console.log('   ❌ Tasa de éxito baja (<90%)');
      console.log('   🔧 Requiere optimización antes de producción');
    }

    if (summary.avgThroughput >= 5) {
      console.log('   ✅ Throughput excelente (≥5 archivos/min)');
    } else if (summary.avgThroughput >= 3) {
      console.log('   ⚠️  Throughput aceptable (3-5 archivos/min)');
    } else {
      console.log('   ❌ Throughput bajo (<3 archivos/min)');
      console.log('   💡 Considerar optimizaciones de procesamiento');
    }

    // Análisis por fase
    const phase3 = this.results.find(r => r.phase === 3);
    if (phase3 && phase3.errorCount > 2) {
      console.log('   ⚠️  Fase 3 (10 archivos) tuvo varios errores');
      console.log('   💡 Posible saturación de Inngest (límite 10 concurrent)');
      console.log('   💡 Considerar: Upgrade Inngest Pro o eliminar Inngest');
    }

    if (summary.totalCost < 0.05) {
      console.log('   ✅ Coste total dentro de lo esperado (<€0.05)');
    }

    console.log('\n' + '='.repeat(60));
    console.log('ℹ️  Esto fue una SIMULACIÓN. Para pruebas reales:');
    console.log('   1. Instalar FFmpeg');
    console.log('   2. Ejecutar: npm run stress-test');
    console.log('   3. Revisar: stress-test-report.json');
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Guardar reporte
   */
  async saveReport(data) {
    const reportPath = path.join(__dirname, '..', 'stress-test-demo-report.json');
    await writeFile(reportPath, JSON.stringify(data, null, 2));
    console.log(`📄 Reporte guardado: stress-test-demo-report.json\n`);
  }
}

// Ejecutar
console.log('Iniciando stress test en modo demo...\n');
const test = new DemoStressTest();
test.run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
