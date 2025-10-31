import http from "node:http";
import { URL } from "node:url";

export class LoopbackServerError extends Error {}

export const waitForOAuthCallback = (
  redirectUri: string,
  signal?: AbortSignal,
): Promise<URLSearchParams> => {
  return new Promise((resolve, reject) => {
    const target = new URL(redirectUri);
    if (target.protocol !== "http:") {
      reject(new LoopbackServerError("Redirect URI must use http scheme"));
      return;
    }

    const server = http.createServer((req, res) => {
      if (!req.url) {
        res.writeHead(400);
        res.end();
        return;
      }
      const requestUrl = new URL(req.url, `http://${target.host}`);
      if (requestUrl.pathname !== target.pathname) {
        res.writeHead(404);
        res.end();
        return;
      }

      const content = Buffer.from(
        "<html><body><h1>Authentication Complete</h1><p>You may close this window.</p></body></html>",
        "utf8",
      );
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Length": content.length,
      });
      res.end(content);

      resolve(requestUrl.searchParams);

      process.nextTick(() => {
        server.close();
      });
    });

    server.on("error", (err) => {
      reject(err);
    });

    const cleanup = () => {
      server.close();
    };

    if (signal) {
      if (signal.aborted) {
        cleanup();
        reject(signal.reason ?? new Error("OAuth flow aborted"));
        return;
      }
      signal.addEventListener(
        "abort",
        () => {
          cleanup();
          reject(signal.reason ?? new Error("OAuth flow aborted"));
        },
        { once: true },
      );
    }

    const port = target.port ? Number(target.port) : 80;

    server.listen({ host: target.hostname, port }, () => {
      // server ready
    });
  });
};
