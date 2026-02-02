<script lang="ts" setup>
import { useStore } from "@/store";
import type { Settings } from "@shared/types/store";
import { computed, onMounted, watch } from "vue";
import { RouterView } from "vue-router";

const store = useStore();
const theme = computed<Settings["theme"]>(() => store.settings?.theme ?? "dark");

/**
 * Apply the selected theme to the document root.
 */
const applyTheme = (value: Settings["theme"]) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = value;
  // Element Plus uses html.dark for its dark theme variables.
  root.classList.toggle("dark", value === "dark");
  root.style.colorScheme = value;
};

watch(
  theme,
  (value) => {
    applyTheme(value);
  },
  { immediate: true },
);

onMounted(() => {
  console.info("[App] mounted", { theme: theme.value });
});
</script>

<template>
  <div class="theme" :class="[theme]">
    <RouterView />
  </div>
</template>

<style lang="scss" scoped>
.theme {
  display: contents;
}
</style>
