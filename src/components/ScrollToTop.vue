<script setup lang="ts">
import { Icon } from "@iconify/vue";

interface Props {
  visible: boolean;
}

defineProps<Props>();
const emit = defineEmits<{
  (event: "scrollToTop"): void;
}>();

const handleClick = () => {
  emit("scrollToTop");
};
</script>

<template>
  <div class="scroll-to-top" :class="{ visible }">
    <button @click="handleClick" class="nn-button size-small">
      <Icon icon="mingcute:arrow-to-up-fill" class="nn-icon size-small" />
    </button>
  </div>
</template>

<style lang="scss" scoped>
.scroll-to-top {
  position: fixed;
  top: 48px;
  right: 0;
  left: 0;
  z-index: 1;
  display: inline-flex;
  width: 80px;
  margin: 0 auto;
  background-color: var(--dote-color-white-t4);
  border-radius: 4px;
  transform: translateY(-56px);
  opacity: 0.2;
  transition:
    transform 0.1s ease-in-out,
    opacity 0.1s ease-in-out;

  &.visible {
    transform: translateY(0);
    opacity: 1;
  }

  .nn-button {
    width: 100%;

    .nn-icon {
      color: var(--dote-color-black-t5);
    }
  }
}
</style>
