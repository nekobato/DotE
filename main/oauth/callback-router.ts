import { EventEmitter } from "node:events";
import { URL } from "node:url";
import { waitForOAuthCallback as waitForLoopbackCallback, LoopbackServerError } from "./loopback-server";

const CALLBACK_EVENT = "callback";

const emitter = new EventEmitter();
const pendingCallbacks: URL[] = [];

const isHttpScheme = (protocol: string) => protocol === "http:" || protocol === "https:";

const matchesTarget = (candidate: URL, target: URL): boolean => {
  return (
    candidate.protocol === target.protocol &&
    candidate.hostname === target.hostname &&
    candidate.port === target.port &&
    candidate.pathname === target.pathname
  );
};

const consumeMatchingCallback = (target: URL): URL | undefined => {
  const index = pendingCallbacks.findIndex((url) => matchesTarget(url, target));
  if (index === -1) return undefined;
  const [matched] = pendingCallbacks.splice(index, 1);
  return matched;
};

export const notifyOAuthRedirect = (callbackUrl: string) => {
  try {
    const parsed = new URL(callbackUrl);
    pendingCallbacks.push(parsed);
    emitter.emit(CALLBACK_EVENT);
  } catch (error) {
    console.error("[oauth] Failed to parse redirect URI", { callbackUrl, error });
  }
};

export const waitForOAuthCallback = async (redirectUri: string, signal?: AbortSignal): Promise<URLSearchParams> => {
  const target = new URL(redirectUri);

  if (isHttpScheme(target.protocol)) {
    return waitForLoopbackCallback(redirectUri, signal);
  }

  return new Promise((resolve, reject) => {
    const consumeAndResolve = () => {
      const matched = consumeMatchingCallback(target);
      if (!matched) return false;
      cleanup();
      resolve(matched.searchParams);
      return true;
    };

    const onCallback = () => {
      consumeAndResolve();
    };

    const onAbort = () => {
      cleanup();
      reject(signal?.reason ?? new Error("OAuth flow aborted"));
    };

    const cleanup = () => {
      emitter.removeListener(CALLBACK_EVENT, onCallback);
      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }
    };

    if (consumeAndResolve()) {
      return;
    }

    emitter.on(CALLBACK_EVENT, onCallback);

    if (signal) {
      if (signal.aborted) {
        cleanup();
        reject(signal.reason ?? new Error("OAuth flow aborted"));
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }

    if (!isHttpScheme(target.protocol) && !target.protocol) {
      cleanup();
      reject(new LoopbackServerError("Unsupported redirect URI"));
    }
  });
};
