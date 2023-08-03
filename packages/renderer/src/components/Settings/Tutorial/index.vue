<script setup lang="ts">
import { Icon } from "@iconify/vue";
import TutorialAvatar from "@/components/Settings/Tutorial/Avatar.vue";
</script>
<template>
  <div class="hazy-post-container">
    <div class="hazy-post-list">
      <div class="hazy-post">
        <TutorialAvatar />
        <p>Hazy Streamのチュートリアルだよ</p>
      </div>
      <div class="hazy-post">
        <TutorialAvatar />
        <p>
          hazyはながら見に特化したTwitterクライアントだよ。タイムラインを表示しながら他の作業をすることができるよ。書く能力はまだあんまりないよ。
        </p>
      </div>
      <div class="hazy-post">
        <TutorialAvatar />
        <p>
          hazyは起動していることを周りに悟られないように、Dockには出てこないよ。タスクバーに現れたアイコンを押すとメニューが出てきて、ここでモードや画面の表示を切り替えられるよ。設定もここからだね。
        </p>
      </div>
      <div class="hazy-post">
        <TutorialAvatar />
        <p>
          hazyには可視<Icon icon="ion:eye" class="nn-icon" />, 霞<Icon icon="ion:eye-outline" class="nn-icon" />,
          不可視<Icon
            icon="ion:eye-off"
            class="nn-icon"
          />のモードがあるよ。可視は普通のウィンドウと同じで、霞は見えるけど触れないモード。霞モードの透明度は設定から変更できるよ。不可視は隠れてるけどタイムラインは動いてるよ。
        </p>
      </div>
      <div class="hazy-post">
        <TutorialAvatar />
        <p>モードの切り替えはグローバルキーボードショートカットで指定もできるよ。緊急の時には使ってね。</p>
      </div>
      <div class="hazy-post">
        <TutorialAvatar />
        <p>まずは設定からアカウントを追加してね。そして表示したいタイムラインを設定したら使えるようになるよ。</p>
      </div>
      <div class="hazy-post">
        <TutorialAvatar />
        <p>
          何かおかしなことがあったらフォーラムで共有してね！あと腕に覚えのある人は自分でコードを書いてくれてもいいよ。
        </p>
      </div>
    </div>
  </div>
</template>
