<script lang="ts" setup>
import { useStorage } from "@vueuse/core";

const theme = useStorage("theme", "default");
</script>

<template>
  <div class="theme" :class="[theme]">
    <NuxtPage />
  </div>
</template>

<style lang="scss">
@import "~/assets/styles/index";
</style>

<style lang="scss" scoped>
.theme {
  display: contents;
}
</style>
