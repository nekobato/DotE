<script setup lang="ts">
import { Icon } from "@iconify/vue";
import SectionTitle from "../Post/SectionTitle.vue";
import HazyButton from "@/components/common/HazyButton.vue";
import { useStore } from "@/store";

const store = useStore();
</script>

<template>
  <div class="other hazy-post-list">
    <SectionTitle title="その他" />
    <div class="hazy-post indent-1">
      <div class="content">バージョン</div>
      <div class="hazy-post-actions">
        <span>{{ store.state.information.version }}</span>
      </div>
    </div>
    <div class="hazy-post indent-1">
      <div class="content">チュートリアル</div>
      <div class="hazy-post-actions">
        <HazyButton>チュートリアルを表示</HazyButton>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.other {
  width: 100%;
}

.content {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 4px 0;
  color: #fff;
  font-size: var(--font-size-14);
  .title {
    display: inline-flex;
    align-items: center;
    color: var(--color-text-body);
  }
}
.hazy-post-actions {
  font-size: var(--font-size-16);
}
.hazy-post {
  display: flex;
  &.indent-1 {
    padding-left: 16px;
  }
}
</style>
