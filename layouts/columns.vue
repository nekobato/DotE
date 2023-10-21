<template>
  <div class="columns">
    <slot />
  </div>
</template>
<style lang="scss" scoped>
.columns {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--hazy-background-color);
}
</style>
