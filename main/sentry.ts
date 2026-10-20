import * as Sentry from "@sentry/electron/main";
import { filterDiagnosticBreadcrumb } from "../shared/diagnostics";

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
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      graphQL: { document: false, variables: false },
      queues: false,
      stackFrameVariables: false,
    },
    beforeSendLog: () => null,
    beforeBreadcrumb: filterDiagnosticBreadcrumb,
    attachScreenshot: false,
    enableRendererProfiling: false,
    enableOpenTelemetrySetup: false,
  });
};
