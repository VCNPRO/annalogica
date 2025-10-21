// lib/inngest/clients.ts
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "annalogica",
  eventKey: process.env.INNGEST_EVENT_KEY,
  signingKey: process.env.INNGEST_SIGNING_KEY,
});
