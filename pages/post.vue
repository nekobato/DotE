<script lang="ts" setup>
import WindowHeader from "~/components/WindowHeader.vue";
const router = useRouter();

const pagedata = ref<any>({});

window.ipc?.on("post:create", () => {
  router.push("/post/create");
});

window.ipc?.on("post:close", () => {
  router.push("/post");
});

window.ipc?.on("post:detail", (_, payload) => {
  pagedata.value = payload;
  console.info(pagedata);
  router.push("/post/detail");
});

window.ipc?.on("post:reaction", (_, payload) => {
  pagedata.value = payload;
  console.log(payload);
  router.push("/post/reaction");
});
</script>

<template>
  <NuxtLayout name="columns" class="post-page">
    <WindowHeader windowType="post" />
    <NuxtPage :data="pagedata" />
  </NuxtLayout>
</template>
<style lang="scss" scoped></style>
