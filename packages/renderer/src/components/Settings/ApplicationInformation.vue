<script setup lang="ts">
import SectionTitle from "../Post/SectionTitle.vue";
import HazyButton from "@/components/common/HazyButton.vue";
import router from "@/router";
import { information } from "@/store/information";
import { ipcSend } from "@/utils/ipc";

const gotoTutorial = () => {
  router.push("/main/tutorial");
  ipcSend("set-hazy-mode", { mode: "tutorial" });
};
</script>

<template>
  <div class="information hazy-post-list">
    <SectionTitle title="その他" />
    <div class="hazy-post indent-1">
      <div class="content">バージョン</div>
      <div class="form-actions">
        <span>{{ information.version }}</span>
      </div>
    </div>
    <div class="hazy-post indent-1">
      <div class="content">チュートリアル</div>
      <div class="form-actions">
        <HazyButton class="size-small" @click="gotoTutorial">チュートリアルを表示</HazyButton>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.information {
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
.form-actions {
  color: var(--color-text-body);
  font-size: var(--font-size-16);
}
.hazy-post {
  display: flex;
  &.indent-1 {
    padding-left: 16px;
  }
}
</style>
