import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { processTranscription } from '@/lib/inngest/functions';

// Serve Inngest functions via Next.js API route
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processTranscription
  ],
});
