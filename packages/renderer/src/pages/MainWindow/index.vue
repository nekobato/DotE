<script setup lang="ts">
import router from "@/router";
import { onMounted } from "vue";
import { RouterView } from "vue-router";

window.ipc.on("set-hazy-mode", (_, { mode, reflect }) => {
  if (reflect) return;
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
  <RouterView />
</template>
