import { useEventListener } from "@vueuse/core";

type PostSubmitShortcutOptions = {
  target: EventTarget;
  canSubmit: () => boolean;
  submit: () => void | Promise<void>;
};

/** Keep the send shortcut within the lifetime of its composer. */
export function usePostSubmitShortcut({ target, canSubmit, submit }: PostSubmitShortcutOptions) {
  return useEventListener<KeyboardEvent>(target, "keydown", (event) => {
    if (event.isComposing || event.keyCode === 229 || event.repeat) return;
    if (event.key !== "Enter" || (!event.shiftKey && !event.metaKey)) return;
    event.preventDefault();
    if (!canSubmit()) return;

    void submit();
  });
}
