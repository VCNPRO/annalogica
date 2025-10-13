/**
 * Analizador de Calidad de Transcripciones
 *
 * Herramienta para evaluar la calidad de las transcripciones
 * generadas por AssemblyAI y los resúmenes de Claude
 */

import { readFileSync } from 'fs';

interface QualityMetrics {
  // Métricas de transcripción
  wordCount: number;
  averageWordLength: number;
  sentenceCount: number;
  averageSentenceLength: number;
  vocabularyRichness: number; // unique words / total words

  // Métricas de formato
  hasPunctuation: boolean;
  hasCapitalization: boolean;
  hasProperFormatting: boolean;

  // Métricas de contenido
  hasFillerWords: number; // "eh", "um", etc.
  hasRepetitions: number;
  hasIncompleteWords: number; // "[inaudible]", "[crosstalk]", etc.

  // Métricas de diarización
  speakerCount?: number;
  speakerTransitions?: number;
  averageSpeakerSegmentLength?: number;

  // Score general
  overallScore: number; // 0-100
  qualityLevel: 'excellent' | 'good' | 'fair' | 'poor';
}

interface ComparisonMetrics {
  // Comparación con transcripción de referencia
  accuracy: number; // 0-100
  wordErrorRate: number; // WER
  characterErrorRate: number; // CER

  // Diferencias específicas
  missingWords: number;
  extraWords: number;
  substitutedWords: number;

  // Similitud semántica
  semanticSimilarity: number; // 0-100
}

interface SpeakerAnalysis {
  speakerId: string;
  speakerName: string;
  totalDuration: number;
  segmentCount: number;
  averageSegmentLength: number;
  wordCount: number;
  vocabularySize: number;

  // Características del habla
  talkingSpeed: number; // palabras por minuto
  pauseFrequency: number;

  // Calidad
  clarityScore: number; // 0-100
}

class QualityAnalyzer {
  // Lista de palabras de relleno en español e inglés
  private fillerWords = new Set([
    'eh', 'um', 'uh', 'ah', 'er',
    'este', 'bueno', 'pues', 'o sea', 'entonces',
    'like', 'you know', 'i mean', 'basically', 'actually'
  ]);

  /**
   * Analizar calidad de una transcripción
   */
  analyzeTranscription(transcription: string, timestamp?: number[]): QualityMetrics {
    const words = transcription.split(/\s+/).filter(w => w.length > 0);
    const sentences = transcription.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));

    // Contar palabras de relleno
    const fillerWordCount = words.filter(word =>
      this.fillerWords.has(word.toLowerCase())
    ).length;

    // Detectar palabras incompletas/inaudibles
    const incompletePattern = /\[.*?\]|<.*?>|\(.*?\)/g;
    const incompleteWords = (transcription.match(incompletePattern) || []).length;

    // Detectar repeticiones (palabras consecutivas idénticas)
    let repetitions = 0;
    for (let i = 1; i < words.length; i++) {
      if (words[i].toLowerCase() === words[i - 1].toLowerCase()) {
        repetitions++;
      }
    }

    const metrics: QualityMetrics = {
      wordCount: words.length,
      averageWordLength: words.reduce((sum, w) => sum + w.length, 0) / words.length || 0,
      sentenceCount: sentences.length,
      averageSentenceLength: words.length / sentences.length || 0,
      vocabularyRichness: uniqueWords.size / words.length || 0,

      hasPunctuation: /[.,;:!?]/.test(transcription),
      hasCapitalization: /[A-Z]/.test(transcription),
      hasProperFormatting: this.checkProperFormatting(transcription),

      hasFillerWords: fillerWordCount,
      hasRepetitions: repetitions,
      hasIncompleteWords: incompleteWords,

      overallScore: 0,
      qualityLevel: 'poor'
    };

    // Calcular score general
    metrics.overallScore = this.calculateOverallScore(metrics);
    metrics.qualityLevel = this.determineQualityLevel(metrics.overallScore);

    return metrics;
  }

  /**
   * Comparar transcripción con referencia
   */
  compareWithReference(
    transcription: string,
    reference: string
  ): ComparisonMetrics {
    const transcWords = this.normalizeText(transcription).split(/\s+/);
    const refWords = this.normalizeText(reference).split(/\s+/);

    // Calcular distancia de Levenshtein para palabras
    const { distance, operations } = this.levenshteinDistance(transcWords, refWords);

    const wer = (distance / refWords.length) * 100;

    // Calcular CER (Character Error Rate)
    const transcChars = transcription.replace(/\s/g, '').split('');
    const refChars = reference.replace(/\s/g, '').split('');
    const { distance: charDistance } = this.levenshteinDistance(transcChars, refChars);
    const cer = (charDistance / refChars.length) * 100;

    // Calcular similitud semántica (Jaccard similarity)
    const semanticSimilarity = this.calculateJaccardSimilarity(
      new Set(transcWords),
      new Set(refWords)
    ) * 100;

    return {
      accuracy: Math.max(0, 100 - wer),
      wordErrorRate: wer,
      characterErrorRate: cer,
      missingWords: operations.deletions,
      extraWords: operations.insertions,
      substitutedWords: operations.substitutions,
      semanticSimilarity
    };
  }

  /**
   * Analizar hablantes de una transcripción con diarización
   */
  analyzeSpeakers(speakers: any[]): SpeakerAnalysis[] {
    return speakers.map(speaker => {
      const words = speaker.text ? speaker.text.split(/\s+/) : [];
      const uniqueWords = new Set(words.map((w: string) => w.toLowerCase()));

      const avgSegmentLength = speaker.segments ?
        speaker.segments.reduce((sum: number, seg: any) => sum + (seg.end - seg.start), 0) / speaker.segments.length : 0;

      // Calcular velocidad de habla (palabras por minuto)
      const talkingSpeed = speaker.duration > 0 ?
        (words.length / speaker.duration) * 60 : 0;

      return {
        speakerId: speaker.id || speaker.speaker,
        speakerName: speaker.name || `Speaker ${speaker.id}`,
        totalDuration: speaker.duration || 0,
        segmentCount: speaker.segments ? speaker.segments.length : 0,
        averageSegmentLength: avgSegmentLength,
        wordCount: words.length,
        vocabularySize: uniqueWords.size,
        talkingSpeed,
        pauseFrequency: this.calculatePauseFrequency(speaker.segments || []),
        clarityScore: this.calculateClarityScore(speaker)
      };
    });
  }

  /**
   * Analizar calidad de un resumen generado por Claude
   */
  analyzeSummary(summary: string, originalText: string): {
    compressionRatio: number;
    keyPointsCovered: number;
    coherenceScore: number;
    readabilityScore: number;
    overallScore: number;
  } {
    const summaryWords = summary.split(/\s+/).length;
    const originalWords = originalText.split(/\s+/).length;

    // Ratio de compresión
    const compressionRatio = summaryWords / originalWords;

    // Puntos clave cubiertos (heurística simple)
    const keyPointsCovered = this.extractKeyPoints(originalText, summary);

    // Coherencia (basada en conectores y estructura)
    const coherenceScore = this.calculateCoherence(summary);

    // Legibilidad (Flesch Reading Ease adaptado)
    const readabilityScore = this.calculateReadability(summary);

    // Score general
    let overallScore = 0;
    overallScore += compressionRatio >= 0.1 && compressionRatio <= 0.3 ? 25 : 10;
    overallScore += keyPointsCovered >= 70 ? 25 : (keyPointsCovered >= 50 ? 15 : 5);
    overallScore += coherenceScore;
    overallScore += readabilityScore;

    return {
      compressionRatio,
      keyPointsCovered,
      coherenceScore,
      readabilityScore,
      overallScore: Math.min(100, overallScore)
    };
  }

  /**
   * Generar reporte detallado de calidad
   */
  generateQualityReport(
    transcription: string,
    speakers?: any[],
    summary?: string,
    reference?: string
  ): string {
    let report = '═'.repeat(80) + '\n';
    report += '📊 REPORTE DE CALIDAD DE TRANSCRIPCIÓN\n';
    report += '═'.repeat(80) + '\n\n';

    // Análisis de transcripción
    const transMetrics = this.analyzeTranscription(transcription);
    report += '🎯 MÉTRICAS DE TRANSCRIPCIÓN\n';
    report += '─'.repeat(80) + '\n';
    report += `Palabras: ${transMetrics.wordCount}\n`;
    report += `Oraciones: ${transMetrics.sentenceCount}\n`;
    report += `Riqueza de vocabulario: ${(transMetrics.vocabularyRichness * 100).toFixed(1)}%\n`;
    report += `Palabras de relleno: ${transMetrics.hasFillerWords}\n`;
    report += `Repeticiones: ${transMetrics.hasRepetitions}\n`;
    report += `Palabras incompletas: ${transMetrics.hasIncompleteWords}\n`;
    report += `\nScore General: ${transMetrics.overallScore.toFixed(1)}/100\n`;
    report += `Nivel de Calidad: ${this.getQualityEmoji(transMetrics.qualityLevel)} ${transMetrics.qualityLevel.toUpperCase()}\n\n`;

    // Comparación con referencia
    if (reference) {
      const comparison = this.compareWithReference(transcription, reference);
      report += '📝 COMPARACIÓN CON REFERENCIA\n';
      report += '─'.repeat(80) + '\n';
      report += `Precisión: ${comparison.accuracy.toFixed(1)}%\n`;
      report += `WER (Word Error Rate): ${comparison.wordErrorRate.toFixed(2)}%\n`;
      report += `CER (Character Error Rate): ${comparison.characterErrorRate.toFixed(2)}%\n`;
      report += `Palabras faltantes: ${comparison.missingWords}\n`;
      report += `Palabras extra: ${comparison.extraWords}\n`;
      report += `Palabras sustituidas: ${comparison.substitutedWords}\n`;
      report += `Similitud semántica: ${comparison.semanticSimilarity.toFixed(1)}%\n\n`;
    }

    // Análisis de hablantes
    if (speakers && speakers.length > 0) {
      const speakerAnalysis = this.analyzeSpeakers(speakers);
      report += '🎤 ANÁLISIS DE HABLANTES\n';
      report += '─'.repeat(80) + '\n';
      speakerAnalysis.forEach((speaker, idx) => {
        report += `\nHablante ${idx + 1}: ${speaker.speakerName}\n`;
        report += `  Duración total: ${speaker.totalDuration.toFixed(1)}s\n`;
        report += `  Segmentos: ${speaker.segmentCount}\n`;
        report += `  Palabras: ${speaker.wordCount}\n`;
        report += `  Velocidad: ${speaker.talkingSpeed.toFixed(0)} palabras/min\n`;
        report += `  Claridad: ${speaker.clarityScore.toFixed(1)}/100\n`;
      });
      report += '\n';
    }

    // Análisis de resumen
    if (summary) {
      const summaryAnalysis = this.analyzeSummary(summary, transcription);
      report += '📄 ANÁLISIS DE RESUMEN\n';
      report += '─'.repeat(80) + '\n';
      report += `Ratio de compresión: ${(summaryAnalysis.compressionRatio * 100).toFixed(1)}%\n`;
      report += `Puntos clave cubiertos: ${summaryAnalysis.keyPointsCovered.toFixed(1)}%\n`;
      report += `Coherencia: ${summaryAnalysis.coherenceScore.toFixed(1)}/100\n`;
      report += `Legibilidad: ${summaryAnalysis.readabilityScore.toFixed(1)}/100\n`;
      report += `Score General: ${summaryAnalysis.overallScore.toFixed(1)}/100\n\n`;
    }

    report += '═'.repeat(80) + '\n';

    return report;
  }

  // Métodos auxiliares privados

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private checkProperFormatting(text: string): boolean {
    // Verificar que las oraciones empiecen con mayúscula
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const properlyCapitalized = sentences.filter(s =>
      /^[A-Z]/.test(s.trim())
    ).length;

    return properlyCapitalized / sentences.length > 0.8;
  }

  private calculateOverallScore(metrics: QualityMetrics): number {
    let score = 100;

    // Penalizaciones
    if (!metrics.hasPunctuation) score -= 15;
    if (!metrics.hasCapitalization) score -= 10;
    if (!metrics.hasProperFormatting) score -= 10;

    // Penalizar por palabras de relleno (max -15 puntos)
    const fillerRatio = metrics.hasFillerWords / metrics.wordCount;
    score -= Math.min(15, fillerRatio * 100);

    // Penalizar por repeticiones (max -10 puntos)
    const repetitionRatio = metrics.hasRepetitions / metrics.wordCount;
    score -= Math.min(10, repetitionRatio * 100);

    // Penalizar por palabras incompletas (max -15 puntos)
    const incompleteRatio = metrics.hasIncompleteWords / metrics.wordCount;
    score -= Math.min(15, incompleteRatio * 100);

    // Bonificar por riqueza de vocabulario
    if (metrics.vocabularyRichness > 0.6) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  private determineQualityLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    return 'poor';
  }

  private getQualityEmoji(level: string): string {
    const emojis = {
      excellent: '🌟',
      good: '✅',
      fair: '⚠️',
      poor: '❌'
    };
    return emojis[level as keyof typeof emojis] || '❓';
  }

  private levenshteinDistance(
    arr1: string[],
    arr2: string[]
  ): { distance: number; operations: { insertions: number; deletions: number; substitutions: number } } {
    const m = arr1.length;
    const n = arr2.length;
    const dp: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));

    // Inicializar primera fila y columna
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    // Llenar matriz
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (arr1[i - 1] === arr2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j],     // deletion
            dp[i][j - 1],     // insertion
            dp[i - 1][j - 1]  // substitution
          );
        }
      }
    }

    // Contar operaciones (simplificado)
    let insertions = 0, deletions = 0, substitutions = 0;
    let i = m, j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && arr1[i - 1] === arr2[j - 1]) {
        i--; j--;
      } else if (i > 0 && (j === 0 || dp[i - 1][j] < dp[i][j - 1])) {
        deletions++;
        i--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] < dp[i - 1][j])) {
        insertions++;
        j--;
      } else {
        substitutions++;
        i--; j--;
      }
    }

    return {
      distance: dp[m][n],
      operations: { insertions, deletions, substitutions }
    };
  }

  private calculateJaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }

  private calculatePauseFrequency(segments: any[]): number {
    if (segments.length <= 1) return 0;

    let pauses = 0;
    for (let i = 1; i < segments.length; i++) {
      const gap = segments[i].start - segments[i - 1].end;
      if (gap > 0.5) pauses++; // Pausa mayor a 0.5 segundos
    }

    const totalDuration = segments[segments.length - 1].end - segments[0].start;
    return (pauses / totalDuration) * 60; // pausas por minuto
  }

  private calculateClarityScore(speaker: any): number {
    let score = 80; // base

    // Penalizar por segmentos muy cortos (indicador de interrupciones)
    if (speaker.segments) {
      const shortSegments = speaker.segments.filter((s: any) => s.end - s.start < 1).length;
      const shortRatio = shortSegments / speaker.segments.length;
      score -= shortRatio * 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  private extractKeyPoints(original: string, summary: string): number {
    // Extraer palabras clave del original (simplificado)
    const originalWords = this.normalizeText(original).split(/\s+/);
    const summaryWords = new Set(this.normalizeText(summary).split(/\s+/));

    // Palabras importantes (más de 5 caracteres, no stopwords)
    const stopwords = new Set(['este', 'esta', 'estos', 'estas', 'para', 'con', 'por', 'como', 'pero', 'the', 'and', 'for', 'with']);
    const keyWords = originalWords.filter(w => w.length > 5 && !stopwords.has(w));
    const uniqueKeyWords = [...new Set(keyWords)];

    // Contar cuántas aparecen en el resumen
    const covered = uniqueKeyWords.filter(w => summaryWords.has(w)).length;

    return (covered / uniqueKeyWords.length) * 100;
  }

  private calculateCoherence(text: string): number {
    // Detectar conectores y palabras de transición
    const connectors = ['además', 'por lo tanto', 'sin embargo', 'finalmente', 'en resumen', 'también', 'furthermore', 'however', 'therefore', 'finally'];
    let score = 50;

    connectors.forEach(connector => {
      if (text.toLowerCase().includes(connector)) {
        score += 5;
      }
    });

    return Math.min(100, score);
  }

  private calculateReadability(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/);
    const avgSentenceLength = words.length / sentences.length;

    // Fórmula simplificada: penalizar oraciones muy largas o muy cortas
    let score = 100;
    if (avgSentenceLength > 25) score -= (avgSentenceLength - 25) * 2;
    if (avgSentenceLength < 10) score -= (10 - avgSentenceLength) * 3;

    return Math.max(0, Math.min(100, score));
  }
}

export default QualityAnalyzer;
