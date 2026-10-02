import { describe, expect, it, vi } from "vitest";
import { effectScope, nextTick } from "vue";
import { usePostSubmitShortcut } from "./usePostSubmitShortcut";

function keydown(target: EventTarget, overrides: Partial<KeyboardEvent> = {}) {
  const event = new Event("keydown", { cancelable: true });
  Object.assign(event, {
    key: "Enter",
    keyCode: 13,
    shiftKey: true,
    metaKey: false,
    isComposing: false,
    repeat: false,
    ...overrides,
  });
  target.dispatchEvent(event);
  return event;
}

function mountShortcut(target: EventTarget, submit = vi.fn(), canSubmit = () => true) {
  const scope = effectScope();
  scope.run(() => usePostSubmitShortcut({ target, submit, canSubmit }));
  return { scope, submit };
}

describe("post send shortcut", () => {
  it.each([
    { shiftKey: true, metaKey: false },
    { shiftKey: false, metaKey: true },
  ])("sends with Shift+Enter or Cmd+Enter", async (modifiers) => {
    const target = new EventTarget();
    const { scope, submit } = mountShortcut(target);
    await nextTick();

    const event = keydown(target, modifiers);
    expect(submit).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
    scope.stop();
  });

  it("only sends from the new composer after closing and reopening", async () => {
    const target = new EventTarget();
    const first = mountShortcut(target);
    await nextTick();
    first.scope.stop();
    const second = mountShortcut(target);
    await nextTick();

    keydown(target);
    expect(first.submit).not.toHaveBeenCalled();
    expect(second.submit).toHaveBeenCalledOnce();
    second.scope.stop();
  });

  it.each([
    { shiftKey: true, metaKey: false },
    { shiftKey: false, metaKey: true },
  ])("blocks the default input action when submission is unavailable: %j", async (modifiers) => {
    const target = new EventTarget();
    const { scope, submit } = mountShortcut(target, vi.fn(), () => false);
    await nextTick();

    expect(keydown(target, modifiers).defaultPrevented).toBe(true);
    expect(keydown(target, modifiers).defaultPrevented).toBe(true);
    expect(submit).not.toHaveBeenCalled();
    scope.stop();
  });

  it("does not send again while a submission is pending", async () => {
    const target = new EventTarget();
    let sending = false;
    const submit = vi.fn(() => {
      sending = true;
    });
    const { scope } = mountShortcut(target, submit, () => !sending);
    await nextTick();

    keydown(target);
    keydown(target);
    expect(submit).toHaveBeenCalledOnce();
    scope.stop();
  });

  it.each([
    { isComposing: true },
    { keyCode: 229 },
    { repeat: true },
    { shiftKey: false, metaKey: false },
    { key: "Escape" },
  ])("preserves composition, key repeat, and ordinary input: %j", async (overrides) => {
    const target = new EventTarget();
    const { scope, submit } = mountShortcut(target);
    await nextTick();

    const event = keydown(target, overrides);
    expect(submit).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
    scope.stop();
  });
});
