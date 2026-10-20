import { shell } from "electron";

/** Remote content may open web pages, never arbitrary native protocol handlers. */
export const openExternalWebUrl = async (value: unknown): Promise<boolean> => {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    await shell.openExternal(url.href);
    return true;
  } catch {
    return false;
  }
};
