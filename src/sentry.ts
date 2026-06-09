import type { App as VueApp, ComponentPublicInstance } from "vue";
import * as Sentry from "@sentry/electron/renderer";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

/**
 * Resolve a readable Vue component name for Sentry context.
 */
const getVueComponentName = (instance: ComponentPublicInstance | null): string | undefined => {
  return instance?.$options.name;
};

/**
 * Forward Vue component errors to Sentry while preserving any existing handler.
 */
const bindVueErrorHandler = (app: VueApp): void => {
  const previousErrorHandler = app.config.errorHandler;

  app.config.errorHandler = (error, instance, info) => {
    Sentry.captureException(error, {
      contexts: {
        vue: {
          component: getVueComponentName(instance),
          info,
        },
      },
    });

    previousErrorHandler?.(error, instance, info);
  };
};

/**
 * Initialize production-only Sentry error reporting for the Vue renderer process.
 */
export const initializeRendererSentry = (app: VueApp): void => {
  if (!import.meta.env.PROD || !sentryDsn) {
    return;
  }

  Sentry.init({
    sendDefaultPii: false,
  });
  bindVueErrorHandler(app);
};
