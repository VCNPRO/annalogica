/**
 * Dashboard de Métricas de Testing
 *
 * Visualiza y analiza los resultados de los tests
 * en formato HTML interactivo
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

interface DashboardData {
  sessions: any[];
  aggregatedMetrics: {
    totalTests: number;
    totalSessions: number;
    overallPassRate: number;
    averageUploadTime: number;
    averageProcessingTime: number;
    averageTimeRatio: number;
    averageTranscriptionQuality: number;
    averageDiarizationQuality: number;

    // Por tipo de archivo
    byFileType: Record<string, {
      count: number;
      avgProcessingTime: number;
      avgQuality: number;
    }>;

    // Tendencias temporales
    timeline: Array<{
      date: string;
      passRate: number;
      avgProcessingTime: number;
      avgQuality: number;
    }>;
  };
}

class MetricsDashboard {
  private resultsDir = './testing/results';

  /**
   * Cargar todos los resultados de tests
   */
  loadAllResults(): any[] {
    try {
      const files = readdirSync(this.resultsDir)
        .filter(f => f.endsWith('.json'));

      return files.map(file => {
        const content = readFileSync(join(this.resultsDir, file), 'utf-8');
        return JSON.parse(content);
      }).sort((a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
    } catch (error) {
      console.error('Error loading results:', error);
      return [];
    }
  }

  /**
   * Agregar métricas de todas las sesiones
   */
  aggregateMetrics(sessions: any[]): DashboardData['aggregatedMetrics'] {
    if (sessions.length === 0) {
      return {
        totalTests: 0,
        totalSessions: 0,
        overallPassRate: 0,
        averageUploadTime: 0,
        averageProcessingTime: 0,
        averageTimeRatio: 0,
        averageTranscriptionQuality: 0,
        averageDiarizationQuality: 0,
        byFileType: {},
        timeline: []
      };
    }

    const allResults = sessions.flatMap(s => s.results);
    const totalTests = allResults.length;
    const passedTests = allResults.filter(r => r.errors.length === 0).length;

    // Métricas generales
    const metrics: DashboardData['aggregatedMetrics'] = {
      totalTests,
      totalSessions: sessions.length,
      overallPassRate: (passedTests / totalTests) * 100,
      averageUploadTime: this.average(allResults.map(r => r.uploadTime)),
      averageProcessingTime: this.average(allResults.map(r => r.processingTime)),
      averageTimeRatio: this.average(allResults.filter(r => r.timeRatio).map(r => r.timeRatio)),
      averageTranscriptionQuality: this.average(
        allResults.filter(r => r.transcriptionQuality).map(r => r.transcriptionQuality)
      ),
      averageDiarizationQuality: this.average(
        allResults.filter(r => r.diarizationQuality).map(r => r.diarizationQuality)
      ),
      byFileType: {},
      timeline: []
    };

    // Métricas por tipo de archivo
    const fileTypes = [...new Set(allResults.map(r => r.fileType))];
    fileTypes.forEach(type => {
      const typeResults = allResults.filter(r => r.fileType === type);
      metrics.byFileType[type] = {
        count: typeResults.length,
        avgProcessingTime: this.average(typeResults.map(r => r.processingTime)),
        avgQuality: this.average(
          typeResults.filter(r => r.transcriptionQuality).map(r => r.transcriptionQuality)
        )
      };
    });

    // Timeline (últimos 30 días)
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayResults = allResults.filter(r => {
        const resultDate = new Date(r.timestamp).toISOString().split('T')[0];
        return resultDate === dateStr;
      });

      if (dayResults.length > 0) {
        const dayPassed = dayResults.filter(r => r.errors.length === 0).length;
        metrics.timeline.push({
          date: dateStr,
          passRate: (dayPassed / dayResults.length) * 100,
          avgProcessingTime: this.average(dayResults.map(r => r.processingTime)),
          avgQuality: this.average(
            dayResults.filter(r => r.transcriptionQuality).map(r => r.transcriptionQuality)
          )
        });
      }
    }

    return metrics;
  }

  /**
   * Generar HTML del dashboard
   */
  generateHTML(data: DashboardData): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Annalogica - Dashboard de Métricas</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #333;
      padding: 20px;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    header {
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }

    h1 {
      font-size: 2.5rem;
      color: #667eea;
      margin-bottom: 10px;
    }

    .subtitle {
      color: #666;
      font-size: 1.1rem;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .metric-card {
      background: white;
      border-radius: 12px;
      padding: 25px;
      box-shadow: 0 5px 20px rgba(0,0,0,0.1);
      transition: transform 0.3s ease;
    }

    .metric-card:hover {
      transform: translateY(-5px);
    }

    .metric-label {
      color: #888;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }

    .metric-value {
      font-size: 2.5rem;
      font-weight: bold;
      color: #333;
    }

    .metric-unit {
      font-size: 1.2rem;
      color: #888;
      font-weight: normal;
    }

    .status-badge {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: bold;
      margin-top: 10px;
    }

    .status-excellent { background: #10b981; color: white; }
    .status-good { background: #3b82f6; color: white; }
    .status-warning { background: #f59e0b; color: white; }
    .status-poor { background: #ef4444; color: white; }

    .chart-container {
      background: white;
      border-radius: 12px;
      padding: 25px;
      margin-bottom: 30px;
      box-shadow: 0 5px 20px rgba(0,0,0,0.1);
    }

    .chart-title {
      font-size: 1.5rem;
      margin-bottom: 20px;
      color: #333;
    }

    canvas {
      max-height: 400px;
    }

    .sessions-list {
      background: white;
      border-radius: 12px;
      padding: 25px;
      box-shadow: 0 5px 20px rgba(0,0,0,0.1);
    }

    .session-item {
      border-bottom: 1px solid #eee;
      padding: 15px 0;
    }

    .session-item:last-child {
      border-bottom: none;
    }

    .session-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .session-id {
      font-weight: bold;
      color: #667eea;
    }

    .session-date {
      color: #888;
      font-size: 0.9rem;
    }

    .session-stats {
      display: flex;
      gap: 20px;
      font-size: 0.9rem;
      color: #666;
    }

    .file-type-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }

    .file-type-table th,
    .file-type-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }

    .file-type-table th {
      background: #f8f9fa;
      font-weight: 600;
      color: #667eea;
    }

    .file-type-table tr:hover {
      background: #f8f9fa;
    }

    @media (max-width: 768px) {
      .metrics-grid {
        grid-template-columns: 1fr;
      }

      h1 {
        font-size: 1.8rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>📊 Annalogica - Dashboard de Métricas</h1>
      <p class="subtitle">Análisis de rendimiento y calidad de transcripciones</p>
      <p class="subtitle">Última actualización: ${new Date().toLocaleString('es-ES')}</p>
    </header>

    <!-- Métricas principales -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Tests Totales</div>
        <div class="metric-value">${data.aggregatedMetrics.totalTests}</div>
        <span class="status-badge ${this.getStatusClass(data.aggregatedMetrics.overallPassRate)}">
          ${data.aggregatedMetrics.overallPassRate.toFixed(1)}% aprobados
        </span>
      </div>

      <div class="metric-card">
        <div class="metric-label">Tiempo de Carga Promedio</div>
        <div class="metric-value">
          ${(data.aggregatedMetrics.averageUploadTime / 1000).toFixed(2)}
          <span class="metric-unit">s</span>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-label">Tiempo de Procesamiento</div>
        <div class="metric-value">
          ${(data.aggregatedMetrics.averageProcessingTime / 1000).toFixed(1)}
          <span class="metric-unit">s</span>
        </div>
        ${data.aggregatedMetrics.averageTimeRatio > 0 ? `
        <span class="status-badge ${this.getTimeRatioStatus(data.aggregatedMetrics.averageTimeRatio)}">
          ${data.aggregatedMetrics.averageTimeRatio.toFixed(2)}x ratio
        </span>
        ` : ''}
      </div>

      <div class="metric-card">
        <div class="metric-label">Calidad de Transcripción</div>
        <div class="metric-value">
          ${data.aggregatedMetrics.averageTranscriptionQuality.toFixed(1)}
          <span class="metric-unit">%</span>
        </div>
        <span class="status-badge ${this.getQualityStatus(data.aggregatedMetrics.averageTranscriptionQuality)}">
          ${this.getQualityLabel(data.aggregatedMetrics.averageTranscriptionQuality)}
        </span>
      </div>

      <div class="metric-card">
        <div class="metric-label">Calidad de Diarización</div>
        <div class="metric-value">
          ${data.aggregatedMetrics.averageDiarizationQuality.toFixed(1)}
          <span class="metric-unit">%</span>
        </div>
        <span class="status-badge ${this.getQualityStatus(data.aggregatedMetrics.averageDiarizationQuality)}">
          ${this.getQualityLabel(data.aggregatedMetrics.averageDiarizationQuality)}
        </span>
      </div>

      <div class="metric-card">
        <div class="metric-label">Sesiones de Testing</div>
        <div class="metric-value">${data.aggregatedMetrics.totalSessions}</div>
      </div>
    </div>

    <!-- Gráfico de timeline -->
    ${data.aggregatedMetrics.timeline.length > 0 ? `
    <div class="chart-container">
      <h2 class="chart-title">📈 Tendencia de Calidad (Últimos 30 días)</h2>
      <canvas id="timelineChart"></canvas>
    </div>
    ` : ''}

    <!-- Métricas por tipo de archivo -->
    <div class="chart-container">
      <h2 class="chart-title">📁 Rendimiento por Tipo de Archivo</h2>
      <table class="file-type-table">
        <thead>
          <tr>
            <th>Formato</th>
            <th>Tests</th>
            <th>Tiempo Promedio</th>
            <th>Calidad Promedio</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(data.aggregatedMetrics.byFileType).map(([type, stats]) => `
            <tr>
              <td><strong>${type.toUpperCase()}</strong></td>
              <td>${stats.count}</td>
              <td>${(stats.avgProcessingTime / 1000).toFixed(1)}s</td>
              <td>
                <span class="status-badge ${this.getQualityStatus(stats.avgQuality)}">
                  ${stats.avgQuality.toFixed(1)}%
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Gráfico de distribución por formato -->
    <div class="chart-container">
      <h2 class="chart-title">🥧 Distribución de Tests por Formato</h2>
      <canvas id="fileTypeChart"></canvas>
    </div>

    <!-- Sesiones recientes -->
    <div class="sessions-list">
      <h2 class="chart-title">🕐 Sesiones Recientes</h2>
      ${data.sessions.slice(0, 10).map(session => `
        <div class="session-item">
          <div class="session-header">
            <span class="session-id">${session.sessionId}</span>
            <span class="session-date">${new Date(session.startTime).toLocaleString('es-ES')}</span>
          </div>
          <div class="session-stats">
            <span>Tests: ${session.summary.totalTests}</span>
            <span>✅ ${session.summary.passed}</span>
            <span>❌ ${session.summary.failed}</span>
            <span>Calidad: ${session.summary.averageTranscriptionQuality.toFixed(1)}%</span>
          </div>
        </div>
      `).join('')}
    </div>
  </div>

  <script>
    // Timeline Chart
    ${data.aggregatedMetrics.timeline.length > 0 ? `
    const timelineCtx = document.getElementById('timelineChart');
    new Chart(timelineCtx, {
      type: 'line',
      data: {
        labels: ${JSON.stringify(data.aggregatedMetrics.timeline.map(t => t.date))},
        datasets: [
          {
            label: 'Calidad (%)',
            data: ${JSON.stringify(data.aggregatedMetrics.timeline.map(t => t.avgQuality))},
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Tasa de Éxito (%)',
            data: ${JSON.stringify(data.aggregatedMetrics.timeline.map(t => t.passRate))},
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'top' }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });
    ` : ''}

    // File Type Distribution Chart
    const fileTypeCtx = document.getElementById('fileTypeChart');
    new Chart(fileTypeCtx, {
      type: 'doughnut',
      data: {
        labels: ${JSON.stringify(Object.keys(data.aggregatedMetrics.byFileType))},
        datasets: [{
          data: ${JSON.stringify(Object.values(data.aggregatedMetrics.byFileType).map(s => s.count))},
          backgroundColor: [
            '#667eea',
            '#764ba2',
            '#f093fb',
            '#4facfe',
            '#43e97b',
            '#fa709a'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'right' }
        }
      }
    });
  </script>
</body>
</html>
    `;
  }

  /**
   * Generar y guardar dashboard
   */
  generate(): void {
    console.log('📊 Generando Dashboard de Métricas...\n');

    const sessions = this.loadAllResults();
    if (sessions.length === 0) {
      console.log('⚠️  No hay resultados de tests disponibles.');
      console.log('Ejecuta tests primero usando test-runner.ts\n');
      return;
    }

    const aggregatedMetrics = this.aggregateMetrics(sessions);

    const data: DashboardData = {
      sessions,
      aggregatedMetrics
    };

    const html = this.generateHTML(data);
    const outputPath = './testing/dashboard.html';

    writeFileSync(outputPath, html);

    console.log('✅ Dashboard generado exitosamente!');
    console.log(`📁 Ubicación: ${outputPath}`);
    console.log(`\n📊 Resumen:`);
    console.log(`   - ${data.aggregatedMetrics.totalSessions} sesiones de testing`);
    console.log(`   - ${data.aggregatedMetrics.totalTests} tests ejecutados`);
    console.log(`   - ${data.aggregatedMetrics.overallPassRate.toFixed(1)}% tasa de éxito`);
    console.log(`   - ${data.aggregatedMetrics.averageTranscriptionQuality.toFixed(1)}% calidad promedio\n`);
  }

  // Utilidades
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  private getStatusClass(passRate: number): string {
    if (passRate >= 90) return 'status-excellent';
    if (passRate >= 75) return 'status-good';
    if (passRate >= 60) return 'status-warning';
    return 'status-poor';
  }

  private getTimeRatioStatus(ratio: number): string {
    if (ratio <= 0.20) return 'status-excellent';
    if (ratio <= 0.35) return 'status-good';
    if (ratio <= 0.50) return 'status-warning';
    return 'status-poor';
  }

  private getQualityStatus(quality: number): string {
    if (quality >= 95) return 'status-excellent';
    if (quality >= 85) return 'status-good';
    if (quality >= 70) return 'status-warning';
    return 'status-poor';
  }

  private getQualityLabel(quality: number): string {
    if (quality >= 95) return 'Excelente';
    if (quality >= 85) return 'Bueno';
    if (quality >= 70) return 'Aceptable';
    return 'Mejorable';
  }
}

// Exportar y ejecutar si se llama directamente
export default MetricsDashboard;

if (require.main === module) {
  const dashboard = new MetricsDashboard();
  dashboard.generate();
}
