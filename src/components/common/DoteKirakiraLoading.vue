<template>
  <div class="loading" />
</template>

<style lang="scss" scoped>
.loading {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: var(--dote-color-white-t1);

  &::after {
    position: absolute;
    top: -20%;
    z-index: 1;
    width: 100%;
    height: 140%;
    background: linear-gradient(
      120deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.1) 50%,
      rgba(255, 255, 255, 0) 99%,
      rgba(255, 255, 255, 0) 100%
    );
    transform: translate(100%, 20%);
    transform: translateX(100%);
    animation: slide 1s infinite;
    content: "";
  }
}

@keyframes slide {
  0% {
    transform: translate(-100%, -20%);
  }
  20% {
    transform: translate(-100%, -20%);
  }
  80% {
    transform: translateX(100%, 20%);
  }
  100% {
    transform: translateX(100%, 20%);
  }
}
</style>
