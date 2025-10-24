// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Contexto adicional para errores del servidor
  beforeSend(event, hint) {
    // Agregar información del usuario si está disponible
    if (event.request?.headers) {
      const headers = event.request.headers;

      // Log útil para debugging
      console.error('[Sentry] Error capturado:', {
        message: event.exception?.values?.[0]?.value,
        url: event.request?.url,
        method: event.request?.method,
      });
    }

    return event;
  },
});
