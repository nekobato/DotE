export const ipcSend = (event: string, payload?: object) => {
  if (typeof window === 'undefined') return;
  window.ipc.send(event, JSON.stringify(payload));
};

export const ipcInvoke = (event: string, payload?: object) => {
  if (typeof window === 'undefined') return;
  return window.ipc.invoke(event, JSON.stringify(payload));
};
