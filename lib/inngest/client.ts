// lib/inngest/client.ts
import { Inngest } from "inngest";

// Configuración de Inngest con soporte para desarrollo y producción
// En desarrollo, Inngest puede funcionar sin eventKey/signingKey
// En producción, estas claves son obligatorias y se configuran en Vercel
const inngestConfig: any = {
  id: "annalogica",
};

// Solo agregar eventKey si está definida (necesario para producción)
if (process.env.INNGEST_EVENT_KEY) {
  inngestConfig.eventKey = process.env.INNGEST_EVENT_KEY;
} else {
  // En desarrollo local, usar modo dev
  inngestConfig.isDev = true;
}

export const inngest = new Inngest(inngestConfig);
