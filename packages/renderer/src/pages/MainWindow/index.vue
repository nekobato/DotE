<script setup lang="ts">
import router from "@/router";
import { useStore } from "@/store";
import { useSettingsStore } from "@/store/settings";
import { onMounted } from "vue";
import { RouterView } from "vue-router";

const store = useStore();
store.init();
const settingsStore = useSettingsStore();

window.ipc.on("set-hazy-mode", (_, { mode, reflect }) => {
  if (reflect) return;

  settingsStore.setHazyMode(mode);

  switch (mode) {
    case "settings":
      router.push("/main/settings");
      break;
    case "show":
    case "haze":
      router.push("/main/timeline");
      break;
    default:
      break;
  }
});

window.ipc.on("resize", (_, bounds) => {
  window.localStorage.setItem("bounds", JSON.stringify(bounds));
});

onMounted(() => {
  const bounds = window.localStorage.getItem("bounds");
  if (bounds) {
    window.ipc.send("resize", bounds);
  }
});
</script>
<template>
  <RouterView :class="{ haze: store.settings.hazyMode === 'haze' }" />
</template>
<style lang="scss" scoped>
.haze {
  pointer-events: none;
}
</style>
