// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
// 🛡️ Inicialización condicional: solo en producción para evitar timeouts
// contra ingest.us.sentry.io desde redes locales/restrictivas.

import * as Sentry from "@sentry/nextjs";

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: "https://ef838f2e770ce69e434d309c2d9b0a5a@o4511225008619520.ingest.us.sentry.io/4511225010323456",

    // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
    tracesSampleRate: 1,

    // Enable sending user PII (Personally Identifiable Information)
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
    sendDefaultPii: true,
  });
}
