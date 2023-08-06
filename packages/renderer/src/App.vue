<script setup lang="ts">
import { ref } from "vue";

const theme = ref("theme-default");

window.ipc.on("theme", (_, theme) => {
  document.documentElement.setAttribute("data-theme", theme);
});
</script>
<template>
  <div class="theme-provider" :class="[theme]">
    <router-view />
  </div>
</template>

<style lang="scss" scoped>
.theme-provider {
  display: contents;
}
</style>
