<script setup lang="ts">
import HazyLoading from "@/components/common/HazyLoading.vue";

defineProps({
  loading: {
    type: Boolean,
    required: false,
    default: false,
  },
});
</script>

<template>
  <button class="nn-button hazy-button" :class="{ loading: loading }">
    <slot></slot>
    <slot class="button-icon" name="icon"></slot>
    <HazyLoading class="loading" size="small" v-if="loading" />
  </button>
</template>

<style lang="scss" scoped>
.button-icon {
  margin-left: 4px;
}
.loading {
  position: absolute;
}
</style>
