import { Inngest } from 'inngest';

// Create Inngest client
export const inngest = new Inngest({
  id: 'annalogica',
  name: 'Annalogica Transcription Service',
  eventKey: process.env.INNGEST_EVENT_KEY, // Required for production
});
