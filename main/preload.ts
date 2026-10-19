import { contextBridge, ipcRenderer, type IpcRendererEvent, webUtils } from "electron";
import { isAppDocument } from "../shared/appDocument";

// --------- Expose some API to the Renderer process. ---------
const expectedDocument = process.argv
  .find((arg) => arg.startsWith("--dote-document-url="))
  ?.slice("--dote-document-url=".length);
if (process.isMainFrame && expectedDocument && isAppDocument(location.href, expectedDocument)) {
  contextBridge.exposeInMainWorld("ipc", {
    send(event: string, payload: any) {
      ipcRenderer.send("renderer-event", event, payload);
    },
    async invoke(event: string, payload: any) {
      const result = await ipcRenderer.invoke("renderer-event", event, payload);
      return result;
    },
    on(event: string, callback: (event: IpcRendererEvent, ...args: any[]) => void) {
      ipcRenderer.on(event, callback);
      return () => ipcRenderer.removeListener(event, callback);
    },
    getPathForFile(file: File) {
      return webUtils.getPathForFile(file);
    },
  });
}
