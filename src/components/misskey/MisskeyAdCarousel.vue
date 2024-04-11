<script lang="ts" setup>
import { MisskeyAd } from "@shared/types/misskey";
import { ElCarousel, ElCarouselItem } from "element-plus";
import { PropType } from "vue";

defineProps({
  items: {
    type: Array as PropType<MisskeyAd[]>,
    required: true,
  },
});
</script>
<template>
  <div class="ad-container">
    <ElCarousel class="carousel misskey-ad-carousel" :autoplay="true" :interval="5000" arrow="always">
      <ElCarouselItem class="carousel-item" v-for="(item, index) in items" :key="index">
        <a :href="item.url" target="_blank" rel="noopener noreferrer">
          <img :src="item.imageUrl" :alt="`ad ${index + 1}`" />
        </a>
      </ElCarouselItem>
    </ElCarousel>
  </div>
</template>
<style lang="scss">
.ad-container {
  position: relative;
  width: 100%;
  margin: 8px 0 0;
  overflow: hidden;
  background-color: transparent;
  background-color: var(--hazy-background-color);
  border: 1px solid var(--hazy-border-color);
  border-radius: 8px;
}
.misskey-ad-carousel {
  /* carousel height */
  height: 90px;
  .el-carousel__container {
    height: 100%;
  }
  .el-carousel__indicators {
    position: absolute;
    bottom: 0;
    display: flex;
    justify-content: center;
    width: 100%;
    --el-carousel-indicator-width: 16px;
  }
}
</style>
<style lang="scss" scoped>
.carousel {
  position: relative;
  height: 120px;

  .carousel-item {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 120px;
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }
  .el-carousel__indicators {
    position: absolute;
    bottom: 0;
    display: flex;
    justify-content: center;
    width: 100%;
  }
}
</style>
