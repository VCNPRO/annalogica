import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { transcribeFile, summarizeFile } from '@/lib/inngest/functions';

// Inngest webhook endpoint - handles background job processing
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    transcribeFile, // New on-demand transcription task
    summarizeFile,  // New on-demand summarization task
  ],
});
