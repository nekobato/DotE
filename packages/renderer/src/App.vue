<script setup lang="ts">
import { onMounted, ref } from 'vue';

const theme = ref('theme-default');

window.ipc.on('theme', (_, theme) => {
  document.documentElement.setAttribute('data-theme', theme);
});

window.ipc.on('resize', (_, bounds) => {
  window.localStorage.setItem('bounds', JSON.stringify(bounds));
});

onMounted(() => {
  const bounds = window.localStorage.getItem('bounds');
  if (bounds) {
    window.ipc.send('resize', bounds);
  }
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
