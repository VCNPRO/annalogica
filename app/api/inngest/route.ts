import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { transcribeFile } from '@/lib/inngest/functions';

// Inngest webhook endpoint - handles background job processing
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    transcribeFile, // New on-demand transcription task
  ],
  signingKey: process.env.INNGEST_SIGNING_KEY,
});
