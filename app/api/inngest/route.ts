import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import {
  transcribeFile,
  summarizeFile,
  processDocument,
  summarizeDocument
} from '@/lib/inngest/functions';

// Inngest webhook endpoint - handles background job processing
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    transcribeFile,     // Transcription task (audio/video)
    summarizeFile,      // Summarization task (audio/video)
    processDocument,    // Document processing (PDF, DOCX, TXT) - NEW PROFESSIONAL APPROACH
    summarizeDocument,  // Legacy document summarization (backward compatibility)
  ],
  signingKey: process.env.INNGEST_SIGNING_KEY,
});
