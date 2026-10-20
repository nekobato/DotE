import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { ipcInvoke } from "./ipc";
import { useStore } from "@/store";

const secrets = ["access-secret", "refresh-secret", "client-secret", "oauth-code-secret", "base64-secret"];
const payload = {
  token: secrets[0],
  refresh_token: secrets[1],
  clientSecret: secrets[2],
  code: secrets[3],
  fileDataBase64: secrets[4],
};
const logs: unknown[][] = [];
beforeEach(() => {
  logs.length = 0;
  for (const level of ["info", "debug", "error"] as const)
    vi.spyOn(console, level).mockImplementation((...args) => logs.push(args));
  setActivePinia(createPinia());
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const expectPrivateLogs = () => secrets.forEach((secret) => expect(JSON.stringify(logs)).not.toContain(secret));

describe("credential-free IPC diagnostics", () => {
  it("preserves real request/response data while logging only metadata", async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true, data: payload });
    vi.stubGlobal("window", { ipc: { invoke } });
    expect(await ipcInvoke("api", payload)).toEqual({ ok: true, data: payload });
    expect(invoke).toHaveBeenCalledWith("api", JSON.stringify(payload));
    expectPrivateLogs();
  });

  it("keeps rejected errors and unavailable-bridge payloads out of logs", async () => {
    const error = new Error(JSON.stringify(payload));
    vi.stubGlobal("window", { ipc: { invoke: vi.fn().mockRejectedValue(error) } });
    await expect(ipcInvoke("api", payload)).rejects.toBe(error);
    vi.stubGlobal("window", {});
    await expect(ipcInvoke("api", payload)).rejects.toThrow("bridge");
    expectPrivateLogs();
  });

  it("initializes the real root store without dumping users or complete state", async () => {
    const store = useStore();
    const users = [{ id: "user", name: "Alice", instanceId: "instance", ...payload }];
    vi.stubGlobal("window", {
      ipc: {
        invoke: async (event: string) => {
          if (event === "db:get-users") return users;
          if (event === "settings:all") return store.settings;
          return [];
        },
      },
    });
    await store.init();
    expect(store.users[0].token).toBe(secrets[0]);
    expectPrivateLogs();
  });
});
