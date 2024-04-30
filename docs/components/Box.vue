<script lang="ts" setup>
import { computed, defineProps } from "vue";

const props = defineProps({
  title: {
    type: String,
  },
  width: {
    type: String,
    required: false,
    default: "400px",
  },
  height: {
    type: String,
    required: false,
    default: "auto",
  },
});

const style = computed(() => ({
  width: props.width,
  height: props.height,
}));
</script>

<template>
  <div class="box" :style="style">
    <span class="title">{{ props.title }}</span>
    <slot />
  </div>
</template>

<style scoped>
.box {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 40px;
  padding: 20px;
  background-image: linear-gradient(
    45deg,
    transparent 25%,
    rgba(255, 255, 255, 0.03) 25%,
    rgba(255, 255, 255, 0.03) 50%,
    transparent 50%,
    transparent 75%,
    rgba(255, 255, 255, 0.03) 75%,
    rgba(255, 255, 255, 0.03) 100%
  );
  background-size: 28.28px 28.28px;
  border: 1px solid rgba(127, 127, 127, 0.5);
  border-radius: 8px;
}

.title {
  position: absolute;
  top: -24px;
  left: 0;
  font-weight: bold;
  font-size: 16px;
}
</style>
