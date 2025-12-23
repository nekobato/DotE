import type { Instance, Timeline, User, Settings } from "@shared/types/store";
import type { ApiInvokeResult } from "@shared/types/ipc";

export const ipcSend = (event: string, payload?: object) => {
  if (typeof window === "undefined") return;
  window.ipc?.send(event, JSON.stringify(payload));
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
}

const summarizeResult = (result: unknown): unknown => {
  if (!result || typeof result !== "object") {
    return result;
  }

  if ("ok" in (result as Record<string, unknown>)) {
    const apiResult = result as { ok: unknown; data?: unknown; error?: unknown };
    return {
      ok: apiResult.ok,
      hasData: apiResult.data !== undefined && apiResult.data !== null,
      dataPreview:
        Array.isArray(apiResult.data) || typeof apiResult.data === "string"
          ? { type: typeof apiResult.data, length: (apiResult.data as any)?.length ?? 0 }
          : apiResult.data && typeof apiResult.data === "object"
            ? Object.keys(apiResult.data as Record<string, unknown>).slice(0, 5)
            : undefined,
      hasError: apiResult.error !== undefined && apiResult.error !== null,
      errorType:
        apiResult.error && typeof apiResult.error === "object" ? (apiResult.error as { type?: string }).type : undefined,
    };
  }

  if (Array.isArray(result)) {
    return { type: "array", length: result.length };
  }

  return Object.keys(result as Record<string, unknown>).slice(0, 5);
};

export const ipcInvoke = async <T extends keyof IpcEventMaps>(
  event: T,
  payload?: IpcEventMaps[T]["args"],
): Promise<IpcEventMaps[T]["result"]> => {
  if (typeof window === "undefined" || !window.ipc) {
    console.error("[ipcInvoke] bridge unavailable", { event, payload });
    throw new Error("ipc bridge is unavailable");
  }

  const serializedPayload = payload === undefined ? undefined : JSON.stringify(payload);
  console.debug(`[ipcInvoke] -> ${event}`, payload ?? null);
  try {
    const result = (await window.ipc.invoke(event, serializedPayload)) as IpcEventMaps[T]["result"];
    console.debug(`[ipcInvoke] <- ${event}`, summarizeResult(result));
    return result;
  } catch (error) {
    console.error(`[ipcInvoke] !! ${event}`, {
      error,
      payload: payload ?? null,
    });
    throw error;
  }
};
