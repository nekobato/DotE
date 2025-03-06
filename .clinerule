# DotE (Dawn of the Elephants) - Fediverse Desktop Client

## プロジェクト概要

DotEはFediverseのクライアントアプリケーションです。Fediverseサービスを利用するユーザー向けに、デスクトップアプリケーションとして提供されます。現在、Misskey, Mastodon, Blueskyに対応しています。

## 技術スタック

- Electron
- Vue 3
- TypeScript
- Pinia
- Element Plus
- SCSS

### 開発環境

- Node.js 22.x
- pnpm 8.x

## プロジェクト構造

- main: Electronのメインプロセス関連のコード
  - api: APIリクエスト関連のコード
  - windows: ウィンドウ管理に関するコード
- renderer: rendererで表示するVue SPA実装
- shared: メインプロセスとレンダラープロセス間で共有される型定義またはロジック

## 実装方法

### Main Process (Electron)

- メインプロセスとレンダラープロセス間の通信はmain/preload.tsで定義されたAPIを使用する
- IPC通信のイベント名は明確な名前空間を持つ（例: 'db:get-users', 'api:misskey:getNote'）
- IPC通信の型定義はIpcEventMapsインターフェースで行い、型安全性を確保する

### renderer (Vue)

- <script setup lang="ts"> を使用してComposition APIを利用する
- propsとemitsは明示的に型定義する
- Vueコンポーネントファイルはパスカルケース（例: MisskeyNote.vue）
- TypeScriptファイルはキャメルケース（例: misskeyStream.ts）
- レンダラープロセスからのIPC通信はsrc/utils/ipc.tsのユーティリティ関数を使用する
- StoreはPiniaを使用し、defineStore関数で定義する
- Storeの状態管理はComposition API形式で行う
- APIリクエストはストア内のメソッドとして実装し、ipcInvokeを使用してメインプロセスに委譲する
- Element PlusはSettingsにあるInputに利用するために導入している。それ以外のレイアウトやデザインでは積極的に使用しない
- レイアウトやデザインには独自のデザインを使用する

### スタイリング

- <style scoped lang="scss"> を使用してコンポーネント固有のスタイルを定義する
- クラス名はkebab-catchで書く
- SCSSの変数は使用せず、css variablesで実装する
- 変数はsrc/assets/styles/variables.scssで定義する
- テーマはsrc/assets/styles/theme/ディレクトリに配置する
- コンポーネントのスタイルはscoped属性付きのstyleタグで定義する

### TypeScript

- 型定義は明示的に行い、anyの使用は避ける
- インターフェースがmainとrendererで共有される型定義の場合はshared/typesに配置する
- コンポーネント固有の型はコンポーネントファイル内で定義する


### エラーハンドリング

- APIリクエストのエラーはtry-catchで捕捉し、Storeのerrorsステートに追加する
- エラーメッセージはユーザーフレンドリーな日本語で表示する
- main processで起こったエラーはIPC通信でrenderer processに伝播し、エラーハンドリングを行う

## テスト

### ユニットテスト

- Vitestを使用してユニットテストを実行する
- テストファイルは実装ファイルの隣に配置する
- テストファイル名は`*.spec.ts`とする

### E2Eテスト

- Spectronを使用してE2Eテストを実行する
- テストファイルは`tests/e2e`ディレクトリに配置する
- テストファイル名は`*.test.ts`とする

## 参考資料

### ライブラリ

- [Electron](https://www.electronjs.org/)
- [Vue 3](https://v3.vuejs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Pinia](https://pinia.esm.dev/)
- [Element Plus](https://element-plus.org/)
- [SCSS](https://sass-lang.com/)
- [Vitest](https://vitest.netlify.app/)
- [Spectron](https://www.electronjs.org/spectron)

### API

- [Misskey API](https://misskey.io/api-doc)
- [Mastodon API](https://docs.joinmastodon.org/client/intro/)
- [Bluesky API](https://blueskyweb.org/docs)

## 開発

- 2回連続でエラーが解決できなかった場合、作業を中断してユーザーに指示を仰ぐ
- 作業中に不明な点がある場合、すぐに質問する