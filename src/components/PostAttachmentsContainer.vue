<template>
  <div class="attachments-container">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.attachments-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  width: 100%;
}
</style>
