<script setup lang="ts">
import HazyLoading from "@/components/common/HazyLoading.vue";

defineProps({
  loading: {
    type: Boolean,
    required: false,
    default: false,
  },
  disabled: {
    type: Boolean,
    required: false,
    default: false,
  },
});
</script>

<template>
  <button class="nn-button type-primary" :class="{ loading: loading }" :disabled="disabled">
    <slot class="slot"></slot>
    <HazyLoading class="loading-icon" size="small" v-if="loading" />
  </button>
</template>

<style lang="scss" scoped>
.loading {
  .slot {
    visibility: hidden;
  }
}
.button-icon {
  margin-left: 4px;
}
.loading-icon {
  position: absolute;
}
</style>
