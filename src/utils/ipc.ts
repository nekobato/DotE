import type { Instance, Timeline, User, Settings } from "@shared/types/store";
import type { ApiInvokeResult } from "@shared/types/ipc";
import type { AutoUpdateState } from "@shared/types/update";
import { summarizeDiagnosticError } from "@shared/diagnostics";

export const ipcSend = (event: string, payload?: object) => {
  if (typeof window === "undefined") return;
  window.ipc?.send(event, JSON.stringify(payload));
};

export const getPathForFile = (file: File): string => {
  if (typeof window === "undefined" || !window.ipc?.getPathForFile) {
    return "";
  }
  return window.ipc.getPathForFile(file);
};

interface IpcEventMaps {
  api: {
    args: any;
    result: ApiInvokeResult<any>;
  };
  pipe: {
    args: any;
    result: any;
  };
  "db:get-users": {
    args: void;
    result: User[];
  };
  "db:upsert-user": {
    args: Omit<User, "id"> | Partial<User>;
    result: User;
  };
  "db:delete-user": {
    args: { id: string };
    result: void;
  };
  "db:get-timeline-all": {
    args: void;
    result: Timeline[];
  };
  "db:set-timeline": {
    args: Omit<Timeline, "id"> | (Partial<Timeline> & { id: string });
    result: void;
  };
  "db:delete-timeline": {
    args: { id: string };
    result: void;
  };
  "db:get-instance-all": {
    args: void;
    result: Instance[];
  };
  "db:upsert-instance": {
    args: (Partial<Instance> & { id: number }) | Omit<Instance, "id">;
    result: Instance;
  };
  "settings:set": {
    args: {
      key: string;
      value: any;
    };
    result: void;
  };
  "settings:all": {
    args: void;
    result: Settings;
  };
  "system:get-fonts": {
    args: void;
    result: string[];
  };
  "app:update:get-state": {
    args: void;
    result: AutoUpdateState;
  };
  "app:update:check": {
    args: void;
    result: AutoUpdateState;
  };
  "app:update:install": {
    args: void;
    result: AutoUpdateState;
  };
}

const summarizeResult = (result: unknown): unknown => {
  if (!result || typeof result !== "object") {
    return { type: typeof result };
  }

  if ("ok" in (result as Record<string, unknown>)) {
    const apiResult = result as { ok: unknown; data?: unknown; error?: unknown };
    return {
      ok: apiResult.ok === true,
      hasData: apiResult.data !== undefined && apiResult.data !== null,
      hasError: apiResult.error !== undefined && apiResult.error !== null,
    };
  }

  if (Array.isArray(result)) {
    return { type: "array", length: result.length };
  }

  return { type: "object" };
};

export const ipcInvoke = async <T extends keyof IpcEventMaps>(
  event: T,
  payload?: IpcEventMaps[T]["args"],
): Promise<IpcEventMaps[T]["result"]> => {
  if (typeof window === "undefined" || !window.ipc) {
    console.error("[ipcInvoke] bridge unavailable", { event });
    throw new Error("ipc bridge is unavailable");
  }

  const serializedPayload = payload === undefined ? undefined : JSON.stringify(payload);
  console.debug(`[ipcInvoke] -> ${event}`);
  try {
    const result = (await window.ipc.invoke(event, serializedPayload)) as IpcEventMaps[T]["result"];
    console.debug(`[ipcInvoke] <- ${event}`, summarizeResult(result));
    return result;
  } catch (error) {
    console.error(`[ipcInvoke] !! ${event}`, summarizeDiagnosticError(error));
    throw error;
  }
};
