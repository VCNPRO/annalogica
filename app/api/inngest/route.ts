import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { transcribeFile, summarizeFile } from '@/lib/inngest/functions';

// Inngest webhook endpoint - handles background job processing
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    transcribeFile, // Transcription task
    summarizeFile,  // Summarization task
  ],
  signingKey: process.env.INNGEST_SIGNING_KEY,
});
