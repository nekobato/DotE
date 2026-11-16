import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref, shallowRef } from "vue";
import { useGlobalShortcutRecorder } from "./useGlobalShortcutRecorder";

const { ipcInvoke } = vi.hoisted(() => ({ ipcInvoke: vi.fn() }));
vi.mock("@/utils/ipc", () => ({ ipcInvoke }));

class TestKeyboardEvent extends Event {
  constructor(key: string, options: Partial<KeyboardEvent> = {}) {
    super("keydown", { cancelable: true });
    Object.assign(this, {
      key,
      code: key,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: false,
      location: 0,
      repeat: false,
      isComposing: false,
      ...options,
    });
  }
}

class TestInput extends EventTarget {
  focus() {
    this.dispatchEvent(new Event("focus"));
  }
}

const scopes: ReturnType<typeof effectScope>[] = [];
const settle = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
};

function setup() {
  const input = new TestInput();
  const shortcut = ref("Ctrl+Alt+X");
  const save = vi.fn(async (value: string) => {
    shortcut.value = value;
  });
  const scope = effectScope();
  scopes.push(scope);
  const recorder = scope.run(() =>
    useGlobalShortcutRecorder(shallowRef(input as unknown as HTMLInputElement), shortcut, save),
  )!;
  input.addEventListener("keydown", (event) => recorder.onKeydown(event as KeyboardEvent), { capture: true });
  input.addEventListener("blur", recorder.cancel);
  const press = (key: string, options: Partial<KeyboardEvent> = {}) => {
    const event = new TestKeyboardEvent(key, options);
    input.dispatchEvent(event);
    return event;
  };
  return { ...recorder, input, shortcut, save, scope, press };
}

beforeEach(() => {
  vi.stubGlobal("KeyboardEvent", TestKeyboardEvent);
  ipcInvoke.mockReset().mockResolvedValue(true);
});

afterEach(async () => {
  scopes.splice(0).forEach((scope) => scope.stop());
  await settle();
  vi.unstubAllGlobals();
});

describe("global shortcut recording", () => {
  it("previews modifiers without saving and confirms a complete combination after native restoration", async () => {
    const recorder = setup();
    expect(recorder.inputAttrs.value.value).toBe("Ctrl+Alt+X");
    await recorder.start();
    expect(ipcInvoke).toHaveBeenCalledWith("shortcuts:set-recording", { recording: true });
    recorder.press("Shift", { code: "ShiftLeft", shiftKey: true });
    expect(recorder.inputAttrs.value.value).toBe("Shift");
    expect(recorder.save).not.toHaveBeenCalled();

    let resume!: (value: boolean) => void;
    ipcInvoke.mockImplementationOnce(() => new Promise((resolve) => (resume = resolve)));
    recorder.press("K", { code: "KeyK", shiftKey: true, metaKey: true });
    await settle();
    expect(recorder.isRecording.value).toBe(false);
    expect(recorder.save).not.toHaveBeenCalled();
    resume(true);
    await settle();
    expect(recorder.save).toHaveBeenCalledExactlyOnceWith("Shift+Meta+K");
    expect(recorder.inputAttrs.value.value).toBe("Shift+Meta+K");
  });

  it.each(["Escape", "Tab", "blur"])("restores handling and preserves the saved shortcut on %s", async (action) => {
    const recorder = setup();
    await recorder.start();
    if (action === "blur") recorder.input.dispatchEvent(new Event("blur"));
    else {
      const event = recorder.press(action);
      expect(event.defaultPrevented).toBe(action === "Escape");
    }
    await settle();
    expect(recorder.isRecording.value).toBe(false);
    expect(recorder.shortcut.value).toBe("Ctrl+Alt+X");
    expect(recorder.save).not.toHaveBeenCalled();
    expect(ipcInvoke).toHaveBeenLastCalledWith("shortcuts:set-recording", { recording: false });
  });

  it.each(["Backspace", "Delete"])("clears a persisted shortcut before the first capture using %s", async (key) => {
    const recorder = setup();
    await recorder.start();
    expect(recorder.press(key).defaultPrevented).toBe(true);
    await settle();
    expect(recorder.save).toHaveBeenCalledExactlyOnceWith("");
    expect(recorder.isRecording.value).toBe(false);
    expect(recorder.inputAttrs.value.value).toBe("");
  });

  it("waits for suspension and does not restart when a late reply arrives after blur", async () => {
    let suspend!: (value: boolean) => void;
    ipcInvoke.mockImplementationOnce(() => new Promise((resolve) => (suspend = resolve)));
    const recorder = setup();
    const starting = recorder.start();
    await settle();
    expect(recorder.isStarting.value).toBe(true);
    expect(recorder.isRecording.value).toBe(false);
    recorder.input.dispatchEvent(new Event("blur"));
    suspend(true);
    await starting;
    await settle();
    expect(recorder.isStarting.value).toBe(false);
    expect(recorder.isRecording.value).toBe(false);
    expect(ipcInvoke.mock.calls.map(([, payload]) => payload.recording)).toEqual([true, false]);
  });

  it("serializes a new session after cancellation of a pending suspension", async () => {
    let suspend!: (value: boolean) => void;
    ipcInvoke.mockImplementationOnce(() => new Promise((resolve) => (suspend = resolve)));
    const recorder = setup();
    const first = recorder.start();
    await settle();
    recorder.cancel();
    const second = recorder.start();
    suspend(true);
    await Promise.all([first, second]);
    expect(ipcInvoke.mock.calls.map(([, payload]) => payload.recording)).toEqual([true, false, true]);
    expect(recorder.isRecording.value).toBe(true);
  });

  it("restores handling after scope disposal, including an in-flight start", async () => {
    let suspend!: (value: boolean) => void;
    ipcInvoke.mockImplementationOnce(() => new Promise((resolve) => (suspend = resolve)));
    const recorder = setup();
    const starting = recorder.start();
    await settle();
    recorder.scope.stop();
    suspend(true);
    await starting;
    await settle();
    expect(recorder.isRecording.value).toBe(false);
    expect(ipcInvoke).toHaveBeenLastCalledWith("shortcuts:set-recording", { recording: false });
  });

  it.each([{ isComposing: true }, { keyCode: 229 }, { repeat: true }])(
    "ignores composition and key repeat: %j",
    async (options) => {
      const recorder = setup();
      await recorder.start();
      recorder.press("K", { code: "KeyK", metaKey: true, ...options });
      await settle();
      expect(recorder.save).not.toHaveBeenCalled();
    },
  );

  it("does not rewrite an unchanged combination", async () => {
    const recorder = setup();
    await recorder.start();
    recorder.press("x", { code: "KeyX", ctrlKey: true, altKey: true });
    await settle();
    expect(recorder.save).not.toHaveBeenCalled();
    expect(ipcInvoke).toHaveBeenLastCalledWith("shortcuts:set-recording", { recording: false });
  });

  it("does not record if suspension is rejected", async () => {
    ipcInvoke.mockResolvedValueOnce(false);
    const recorder = setup();
    await recorder.start();
    expect(recorder.isRecording.value).toBe(false);
    expect(recorder.errorMessage.value).toContain("開始できません");
    expect(recorder.save).not.toHaveBeenCalled();
  });

  it("does not save if native restoration fails", async () => {
    const recorder = setup();
    await recorder.start();
    ipcInvoke.mockRejectedValueOnce(new Error("IPC unavailable"));
    recorder.press("K", { code: "KeyK", metaKey: true });
    await settle();
    expect(recorder.save).not.toHaveBeenCalled();
    expect(recorder.errorMessage.value).toContain("終了できません");
  });

  it("retains the saved display and reports registration or persistence failure", async () => {
    const recorder = setup();
    recorder.save.mockRejectedValueOnce(new Error("Already registered by another app"));
    await recorder.start();
    recorder.press("K", { code: "KeyK", metaKey: true });
    await settle();
    expect(recorder.shortcut.value).toBe("Ctrl+Alt+X");
    expect(recorder.inputAttrs.value.value).toBe("Ctrl+Alt+X");
    expect(recorder.errorMessage.value).toContain("保存できません");
  });
});
