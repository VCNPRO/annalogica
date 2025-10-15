import CircuitBreaker from 'opossum';
import { transcribeAudio, generateSummary, TranscriptionOptions, SummaryResult } from './assemblyai-client';

// Opciones para el Circuit Breaker de AssemblyAI
const assemblyAIOptions: CircuitBreaker.Options = {
  timeout: 45000, // 45 segundos de tiempo de espera para la llamada
  errorThresholdPercentage: 50, // Si el 50% de las llamadas fallan, abrir el circuito
  resetTimeout: 30000, // 30 segundos antes de reintentar (estado HALF-OPEN)
};

// Crear el Circuit Breaker envolviendo la función original de transcripción
export const assemblyAIBreaker = new CircuitBreaker(transcribeAudio, assemblyAIOptions);

// Definir una respuesta de fallback para cuando el circuito esté abierto
assemblyAIBreaker.fallback(() => ({
  error: 'AssemblyAI service is temporarily unavailable. Please try again later.',
}));

// Event listeners para logging (muy útil para monitorización y depuración)
assemblyAIBreaker.on('open', () => {
  console.error(`[Circuit Breaker] OPEN: The AssemblyAI breaker has opened. Service is likely down.`);
});

assemblyAIBreaker.on('close', () => {
  console.log(`[Circuit Breaker] CLOSE: The AssemblyAI breaker has closed. Service has recovered.`);
});

assemblyAIBreaker.on('halfOpen', () => {
  console.warn(`[Circuit Breaker] HALF-OPEN: The AssemblyAI breaker is testing the service availability.`);
});

assemblyAIBreaker.on('fallback', (result) => {
  console.warn(`[Circuit Breaker] FALLBACK: Executing fallback for AssemblyAI. Result: ${JSON.stringify(result)}`);
});


// Opciones para el Circuit Breaker de Claude
const claudeOptions: CircuitBreaker.Options = {
  timeout: 30000, // 30 segundos de tiempo de espera para la llamada
  errorThresholdPercentage: 50, // Si el 50% de las llamadas fallan, abrir el circuito
  resetTimeout: 20000, // 20 segundos antes de reintentar (estado HALF-OPEN)
};

// Crear el Circuit Breaker envolviendo la función de generación de resumen de Claude
export const claudeBreaker = new CircuitBreaker(generateSummary, claudeOptions);

// Definir una respuesta de fallback para cuando el circuito esté abierto
claudeBreaker.fallback(() => ({
  summary: '',
  tags: [],
  error: 'Claude service is temporarily unavailable. Please try again later.',
}));

// Event listeners para logging
claudeBreaker.on('open', () => {
  console.error(`[Circuit Breaker] OPEN: The Claude breaker has opened. Service is likely down.`);
});

claudeBreaker.on('close', () => {
  console.log(`[Circuit Breaker] CLOSE: The Claude breaker has closed. Service has recovered.`);
});

claudeBreaker.on('halfOpen', () => {
  console.warn(`[Circuit Breaker] HALF-OPEN: The Claude breaker is testing the service availability.`);
});

claudeBreaker.on('fallback', (result) => {
  console.warn(`[Circuit Breaker] FALLBACK: Executing fallback for Claude. Result: ${JSON.stringify(result)}`);
});
