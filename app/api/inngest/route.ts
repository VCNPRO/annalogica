import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { processTranscription } from '@/lib/inngest/functions';

// Inngest webhook endpoint - handles background job processing
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processTranscription,
  ],
});
