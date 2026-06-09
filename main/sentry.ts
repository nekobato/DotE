import * as Sentry from "@sentry/electron/main";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

/**
 * Initialize production-only Sentry error reporting for the Electron main process.
 */
export const initializeMainSentry = (): void => {
  if (!process.versions.electron || !import.meta.env.PROD || !sentryDsn) {
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment: "production",
    sendDefaultPii: false,
    attachScreenshot: false,
    enableRendererProfiling: false,
    skipOpenTelemetrySetup: true,
  });
};
