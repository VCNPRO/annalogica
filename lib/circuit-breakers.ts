import CircuitBreaker from 'opossum';
import { transcribeAudio, TranscriptionOptions } from './assemblyai-client';

// Opciones para el Circuit Breaker de AssemblyAI
const assemblyAIOptions: CircuitBreaker.Options = {
timeout: 45000, // 45 segundos de tiempo de espera para la llamada
errorThresholdPercentage: 50, // Si el 50% de las llamadas fallan, abrir el circ
resetTimeout: 30000, // 30 segundos antes de reintentar (estado HALF-OPEN)
};

// Crear el Circuit Breaker envolviendo la función original de transcripción
export const assemblyAIBreaker = new CircuitBreaker(transcribeAudio, assemblyAIOpt

// Definir una respuesta de fallback para cuando el circuito esté abierto
assemblyAIBreaker.fallback(() => ({
error: 'AssemblyAI service is temporarily unavailable. Please try again later.',
}));

// Event listeners para logging (muy útil para monitorización y depuración)
assemblyAIBreaker.on('open', () => {
console.error(`[Circuit Breaker] OPEN: The AssemblyAI breaker has opened. Servic
});

assemblyAIBreaker.on('close', () => {
console.log(`[Circuit Breaker] CLOSE: The AssemblyAI breaker has closed. Service
});

assemblyAIBreaker.on('halfOpen', () => {
console.warn(`[Circuit Breaker] HALF-OPEN: The AssemblyAI breaker is testing the
});

assemblyAIBreaker.on('fallback', (result) => {
console.warn(`[Circuit Breaker] FALLBACK: Executing fallback for AssemblyAI. Res
});

   
