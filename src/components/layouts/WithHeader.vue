<template>
  <div class="layout">
    <slot />
  </div>
</template>
<style lang="scss" scoped>
.layout {
  display: grid;
  grid-template-rows: 40px 1fr;
  width: 100%;
  height: 100%;
  background-color: var(--dote-background-color);
}
</style>
