// DÓNDE: app/api/inngest/route.ts
// MISIÓN: Registrar todas las funciones, incluidas las de documentos ya migradas.

import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';

// Importamos TODAS las funciones que ahora están activas y migradas a OpenAI
import {
  transcribeFile,
  summarizeFile,
  processDocument,
  summarizeDocument
} from '@/lib/inngest/functions';

// El endpoint que gestiona los trabajos en segundo plano
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    transcribeFile,     // Tarea para audio/video
    summarizeFile,      // Tarea para resumir audio/video
    processDocument,    // Tarea para procesar documentos (PDF, etc.)
    summarizeDocument   // Tarea legacy para resumir documentos
  ],
  signingKey: process.env.INNGEST_SIGNING_KEY,
});
