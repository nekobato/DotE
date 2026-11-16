import { recordedHotkeyToElectronAccelerator } from "@/utils/dote";
import { ipcInvoke } from "@/utils/ipc";
import { useEventListener } from "@vueuse/core";
import { computed, onScopeDispose, ref, toValue, type MaybeRefOrGetter } from "vue";
import { useRecordHotkey } from "v-record-hotkey";

export function useGlobalShortcutRecorder(
  input: MaybeRefOrGetter<HTMLInputElement | null>,
  shortcut: MaybeRefOrGetter<string>,
  save: (accelerator: string) => Promise<void>,
) {
  const isStarting = ref(false);
  const isSaving = ref(false);
  const errorMessage = ref("");
  let requestId = 0;
  let hasSession = false;
  let disposed = false;
  let transition = Promise.resolve(true);

  // Serialize suspension and restoration so a late reply cannot restart a canceled session.
  const setRecording = (recording: boolean) => {
    transition = transition.catch(() => false).then(() => ipcInvoke("shortcuts:set-recording", { recording }));
    return transition;
  };

  const releaseRecording = async () => {
    requestId++;
    isStarting.value = false;
    if (hasSession) {
      hasSession = false;
      setRecording(false);
    }
    try {
      if ((await transition) !== true) throw new Error("Shortcut restoration failed");
      return true;
    } catch {
      errorMessage.value = "ショートカットの記録を終了できませんでした。設定画面を再表示してください。";
      return false;
    }
  };

  const persist = async (accelerator: string) => {
    isSaving.value = true;
    try {
      if (!(await releaseRecording())) return;
      if (accelerator !== toValue(shortcut)) await save(accelerator);
    } catch {
      errorMessage.value = "ショートカットを保存できませんでした。別のキーの組み合わせを指定してください。";
    } finally {
      isSaving.value = false;
    }
  };

  const recorder = useRecordHotkey(input, {
    startOnFocus: false,
    startOnClick: false,
    startOnEnter: false,
    // The persisted value is an Electron accelerator; handle clearing it even before the first capture.
    clearKeys: [],
    onConfirm(hotkey) {
      const accelerator = recordedHotkeyToElectronAccelerator(hotkey);
      if (accelerator === null) {
        void releaseRecording();
        errorMessage.value = "このキーはグローバルショートカットに登録できません。";
        return;
      }
      void persist(accelerator);
    },
    onCancel: () => void releaseRecording(),
    onError: () => {
      errorMessage.value = "ショートカットを記録できませんでした。再度入力してください。";
    },
  });

  const start = async () => {
    if (disposed || isStarting.value || isSaving.value || recorder.isRecording.value) return;
    const currentRequest = ++requestId;
    hasSession = true;
    isStarting.value = true;
    errorMessage.value = "";
    try {
      if ((await setRecording(true)) !== true) throw new Error("Shortcut suspension failed");
      if (currentRequest !== requestId || disposed) return;
      isStarting.value = false;
      recorder.start();
      if (!recorder.isRecording.value) await releaseRecording();
    } catch {
      if (currentRequest !== requestId) return;
      await releaseRecording();
      errorMessage.value = "ショートカットの記録を開始できませんでした。再度クリックしてください。";
    } finally {
      if (currentRequest === requestId) isStarting.value = false;
    }
  };

  const cancel = () => {
    recorder.cancel();
    void releaseRecording();
  };

  const onKeydown = (event: KeyboardEvent) => {
    if (event.isComposing || event.keyCode === 229) {
      event.stopImmediatePropagation();
      return;
    }
    if (event.repeat) return;
    const noModifier = !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
    if (event.key === "Tab" && !event.ctrlKey && !event.altKey && !event.metaKey) {
      cancel();
      event.stopImmediatePropagation();
      return;
    }
    if (event.key === "Escape" && noModifier) {
      cancel();
    } else if (!isSaving.value && noModifier && (event.key === "Backspace" || event.key === "Delete")) {
      recorder.clear();
      errorMessage.value = "";
      void persist("");
    } else if (event.key === "Enter" && noModifier && !recorder.isRecording.value) {
      void start();
    } else if (!isStarting.value && !isSaving.value) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  useEventListener("blur", cancel);
  useEventListener("pagehide", cancel);
  onScopeDispose(() => {
    disposed = true;
    cancel();
  });

  return {
    inputAttrs: computed(() => ({
      ...recorder.inputAttrs.value,
      value: recorder.isRecording.value ? recorder.displayValue.value : toValue(shortcut),
      placeholder: "クリックしてキーを入力",
      "aria-invalid": errorMessage.value ? ("true" as const) : undefined,
    })),
    isRecording: recorder.isRecording,
    isStarting,
    isSaving,
    errorMessage,
    start,
    cancel,
    onKeydown,
  };
}
