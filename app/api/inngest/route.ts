// DÓNDE: app/api/inngest/route.ts
// VERSIÓN CORREGIDA: Sincronizado con las funciones que están realmente activas.

import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';

// --- LÍNEAS CORREGIDAS ---
// Importamos solo las funciones que están activas en functions.ts
import {
  transcribeFile,
  summarizeFile
  // processDocument,   <-- Desactivado temporalmente
  // summarizeDocument  <-- Desactivado temporalmente
} from '@/lib/inngest/functions';

// El endpoint que gestiona los trabajos en segundo plano
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    transcribeFile,
    summarizeFile,
    // processDocument,   <-- Desactivado temporalmente
    // summarizeDocument  <-- Desactivado temporalmente
  ],
  signingKey: process.env.INNGEST_SIGNING_KEY,
});

