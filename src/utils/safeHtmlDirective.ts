import type { ObjectDirective } from "vue";
import { setSafeHtml } from "./safeHtml";

export const vSafeHtml: ObjectDirective<HTMLElement, string> = {
  mounted: (element, binding) => setSafeHtml(element, binding.value),
  updated: (element, binding) => setSafeHtml(element, binding.value),
};
