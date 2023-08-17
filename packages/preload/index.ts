import fs from "fs";
import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import { domReady } from "./utils";
import { useLoading } from "./loading";

const { appendLoading, removeLoading } = useLoading();

(async () => {
  await domReady();

  appendLoading();
})();

// --------- Expose some API to the Renderer process. ---------
contextBridge.exposeInMainWorld("fs", fs);
contextBridge.exposeInMainWorld("removeLoading", removeLoading);
contextBridge.exposeInMainWorld("ipc", {
  send(event: string, payload: any) {
    ipcRenderer.send("renderer-event", event, payload);
  },
  async invoke(event: string, payload: any) {
    const result = await ipcRenderer.invoke("renderer-event", event, payload);
    console.log("result", result);
    return result;
  },
  on(event: string, callback: (event: IpcRendererEvent, ...args: any[]) => void) {
    ipcRenderer.on(event, callback);
  },
});
contextBridge.exposeInMainWorld("openUrl", (e: Event, url: string) => {
  e.preventDefault();
  ipcRenderer.send("open-url", { data: url });
});
