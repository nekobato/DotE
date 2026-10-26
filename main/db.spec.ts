import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { StoreSchema } from "./db";

const { context } = vi.hoisted(() => ({ context: { directory: "" } }));

vi.mock("electron", () => ({ safeStorage: { isEncryptionAvailable: () => false } }));
vi.mock("electron-store", async () => {
  const { default: RealStore } = await vi.importActual<typeof import("electron-store")>("electron-store");
  return {
    default: class extends RealStore<StoreSchema> {
      constructor(options: ConstructorParameters<typeof RealStore<StoreSchema>>[0]) {
        super({ ...options, cwd: context.directory, projectVersion: "0.0.23" });
      }
    },
  };
});

beforeAll(() => {
  context.directory = mkdtempSync(join(tmpdir(), "dote-store-compat-"));
});
afterAll(() => rmSync(context.directory, { recursive: true, force: true }));

describe("instance persistence with the installed electron-store", () => {
  it("persists every instance kind without optional icons and reopens without clearing other data", async () => {
    const db = await import("./db");
    db.store.set("settings", { ...db.storeDefaults.settings, opacity: 42 });
    db.store.set("users", [
      { id: "fixture-user", instanceId: "fixture-instance", name: "Fixture", token: "fixture-token", avatarUrl: "" },
    ]);

    for (const type of ["misskey", "mastodon", "bluesky"] as const) {
      const created = db.upsertInstance({ type, name: type, url: `https://${type}.example` });
      expect(created.iconUrl).toBe("");
      const updated = db.upsertInstance({ id: created.id, type, name: `${type} updated`, url: created.url });
      expect(updated.iconUrl).toBe("");
    }

    const persisted = JSON.parse(readFileSync(db.store.path, "utf8"));
    expect(persisted.instances).toHaveLength(3);
    expect(persisted.instances.every((instance: { iconUrl: string }) => instance.iconUrl === "")).toBe(true);
    expect(persisted.instances.map((instance: { type: string }) => instance.type)).toEqual([
      "misskey",
      "mastodon",
      "bluesky",
    ]);

    vi.resetModules();
    const reopened = await import("./db");
    expect(reopened.getInstanceAll()).toEqual(persisted.instances);
    expect(reopened.store.get("users")).toEqual(persisted.users);
    expect(reopened.store.get("settings").opacity).toBe(42);
  });

  it("still rejects invalid icon values without changing the existing file", async () => {
    const db = await import("./db");
    const instance = db.upsertInstance({ type: "misskey", name: "Valid", url: "https://valid.example" });
    const before = readFileSync(db.store.path, "utf8");
    expect(() => Reflect.apply(db.upsertInstance, undefined, [{ ...instance, iconUrl: null }])).toThrow();
    expect(readFileSync(db.store.path, "utf8")).toBe(before);
  });
});
