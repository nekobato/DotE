<script lang="ts" setup>
import { useStorage } from "@vueuse/core";
import { onMounted } from "vue";
import { RouterView } from "vue-router";

const theme = useStorage("theme", "default");

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
