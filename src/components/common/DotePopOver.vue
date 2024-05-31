<script setup lang="ts">
import { ElPopover } from "element-plus";

const props = defineProps({
  content: {
    type: String,
    required: true,
  },
  width: {
    type: String,
    default: "auto",
  },
});
</script>
<template>
  <ElPopover
    :content="props.content"
    placement="bottom"
    :width="props.width"
    trigger="hover"
    transition="none"
    :hide-after="100"
    popper-class="dote-popover"
  >
    <template #reference>
      <slot />
    </template>
  </ElPopover>
</template>

<style lang="scss">
.dote-popover {
  --el-popover-padding: 4px 8px;
  text-align: center;
}
</style>
