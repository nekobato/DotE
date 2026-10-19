import { describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";
import { filterDiagnosticBreadcrumb } from "./diagnostics";

// Exercise the installed Electron SDK's Node dependency without starting Electron.
const requireFromElectron = createRequire(createRequire(import.meta.url).resolve("@sentry/electron/main"));
const Sentry = requireFromElectron("@sentry/node") as typeof import("@sentry/electron/main");

describe("Sentry console privacy boundary", () => {
  it("drops real SDK console breadcrumbs before a captured event envelope is sent", async () => {
    const envelopes: unknown[] = [];
    const consoleSink = vi.spyOn(console, "log").mockImplementation(() => {});
    const received: unknown[] = [];
    Sentry.init({
      dsn: "https://public@example.test/1",
      defaultIntegrations: false,
      integrations: [Sentry.consoleIntegration()],
      beforeBreadcrumb(breadcrumb) {
        received.push(breadcrumb);
        return filterDiagnosticBreadcrumb(breadcrumb);
      },
      transport: () => ({
        send: async (envelope) => {
          envelopes.push(envelope);
          return { statusCode: 200 };
        },
        flush: async () => true,
      }),
    });
    try {
      console.log({ Authorization: "Bearer secret-token", nested: '{"client_secret":"secret-client"}' });
      Sentry.addBreadcrumb({ category: "app.lifecycle", message: "started" });
      Sentry.captureMessage("controlled event");
      await Sentry.flush(2000);
      expect(JSON.stringify(received)).toContain("secret-token");
      const serialized = JSON.stringify(envelopes);
      expect(serialized).toContain("controlled event");
      expect(serialized).toContain("app.lifecycle");
      expect(serialized).not.toContain("secret-token");
      expect(serialized).not.toContain("secret-client");
    } finally {
      await Sentry.close(1000);
      consoleSink.mockRestore();
    }
  });
});
