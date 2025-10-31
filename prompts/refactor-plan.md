# DotE Refactor Plan

## 1. 背景と目的

- Electron + Vue で構成された DotE は、タイムライン取得やマルチプラットフォーム対応のコードが急速に拡張され、重複・責務の混在が増えております。
- 既存コードは機能単位で整備されつつも、Store 層・IPC 層・UI 層で共通化の不足や型の曖昧さが散見され、保守にコストが掛かっています。
- 本計画は **見通し改善 / 不要な取り回しの削減 / 型安全性向上** を軸に、中〜短期でのリファクタリング指針を提示します。

## 2. スコープと優先度

| 項目                                  | 説明                                                          | 優先度 |
| ------------------------------------- | ------------------------------------------------------------- | ------ |
| A. ストリーム層の共通化               | Misskey/Mastodon WebSocket 周りの挙動統一・再接続戦略の一本化 | 高     |
| B. タイムラインドメインの再設計       | `TimelineStore` の責務分離と型定義整理                        | 高     |
| C. 投稿データ変換ユーティリティの整備 | Bluesky/Misskey/Mastodon のポスト整形を共通モジュール化       | 中     |
| D. UI コンポーネントの責務明確化      | Timeline 系コンポーネントの委譲・表示制御の整理               | 中     |
| E. ビルド / テスト基盤整備            | Typecheck・Lint・E2E の整備と自動化                           | 低〜中 |

## 3. 詳細タスク

### A. ストリーム層の共通化（優先度: 高）

1. [ ] `src/utils/misskeyStream.ts`, `src/utils/mastodonStream.ts` の `useWebSocket` 化後の API を再点検し、  
   - [ ] 接続状態・再接続回数・購読キューの共通インタフェースを `src/utils/streaming` に抽出。  
   - [ ] 戻り値を `connect`/`disconnect`/`state`/`send`/`onMessage` で統一。
2. [ ] Misskey/Mastodon で重複する購読キュー処理をストリームユーティリティへ移譲。  
   - [ ] 例: `store.$state.timelines[currentIndex].posts` への差分反映など、使い回せる部分を `TimelineStreamAdapter` のような抽象へ。
3. [ ] `src/composables/useStream.ts` ではストリームごとの分岐を縮小し、  
   - [ ] `createStreamHandler({ platform })` で各プラットフォーム固有ロジックを登録する形へ。  
   - [ ] IPC イベント (`stream:sub-note` 等) も同抽象を通じて呼び出す。

### B. タイムラインドメインの再設計（優先度: 高）

1. [ ] `src/store/index.ts` と `src/store/timeline.ts` の責務を整理。  
   - [ ] `useStore` の初期化 (`initUsers`, `initInstances`, …) をサービス層クラス（例: `TimelineBootstrapper`）に分割し、テスト可能に。  
   - [ ] `TimelineStore` の state を `current`, `cursor`, `filters`, `errors` 等ドメイン型へ寄せる。
2. [ ] `shared/types/store.d.ts` の `Timeline` を DTO 用 (`*Record`), UI 用 (`TimelineView`) の 2 層に分割。  
   - [ ] Electron Store への永続化フォーマットと、Pinia が扱う UI モデルを分離し、型変換を明示化。
3. [ ] `store` 内部で乱用されている `any` や `as` を削減。  
   - [ ] IPC 返却値に専用型（例: `MisskeyTimelineResponse`）を導入し、`ipcInvoke` のジェネリック推論で利用。

### C. 投稿データ変換ユーティリティの整備（優先度: 中）

1. [ ] `src/utils/bluesky.ts` で整備した関数群をベースに、  
   - [ ] Misskey (`src/utils/misskey.ts`), Mastodon (`src/utils/mastodon.ts`) の投稿整形も同様の API へ統一（`derivePostKind`, `extractAttachments`, `extractAuthor` 等）。
2. [ ] `src/components/PostItem/*` からデータ整形ロジックを排除し、`mapToPostViewModel()` 系のユーティリティを挟む。  
   - [ ] コンポーネントは `props` で純粋な ViewModel のみを受け取る構造へ。
3. [ ] ViewModel を `src/types/postView.ts` に定義し、`PostRenderer.vue` は `Array<PostView>` を入力に描画するよう変更。  
   - [ ] 異なるプラットフォームを同じレンダラで扱える余地を作る。

### D. UI コンポーネントの責務明確化（優先度: 中）

1. [ ] `PostRenderer.vue` のプラットフォーム判定 (`shouldShowXxx`) を Strategy パターンへ置換。  
   - [ ] 例: `const renderer = postRendererFactory(props.platform)` のように、描画ロジックをプラグイン化。
2. [ ] `BlueskyPost.vue` / `MisskeyNote.vue` / `MastodonToot.vue` が持つ共通のアクションボタン（開く・リアクション・リポスト）を `PostActions` コンポーネントに集約。
3. [ ] Vue ルール（composition vs options）の統一。現状 `<script setup>` で統一されているが、イベント命名・Props 定義を共通スタイルガイド化。

### E. ビルド / テスト基盤整備（優先度: 低〜中）

1. [ ] `pnpm typecheck` に加え、`pnpm lint` / `pnpm test` コマンドを `package.json` に整備し、`eslint` + `vitest` を導入。  
   - [ ] `src/utils` や `store` の純粋ロジックに対するユニットテストを追加。
2. [ ] VitePress（`docs/`）を活用し、リファクタ後の API / コンポーネントガイドを整理。  
   - [ ] `docs/components` のサンプルを自動生成できる Storybook 連携も検討。
3. [ ] CI（GitHub Actions）で `pnpm install` → `pnpm typecheck` → `pnpm lint` → `pnpm test` のパイプラインを整備。

## 4. ロードマップ提案

1. **スプリント 1（1〜2 週間）**
   - タスク A-1, A-2, B-1（初期化分離）, B-2（型分離）。
   - 影響大のため、回帰テスト手順を作成。
2. **スプリント 2**
   - A-3 完了後に C-1, C-2, C-3 を実施。
   - ViewModel 化に合わせて UI コンポーネント群の調整開始。
3. **スプリント 3 以降**
   - D 系タスクと E 系タスクを並行で推進し、CI 自動化までを完了。
   - ドキュメント整備を行い、参照コストを削減。

## 5. リスクと軽減策

- **ストリーム共通化による回帰リスク**: Misskey 特有の差分取得・購読解除などが複雑なため、統合前に自動テスト + 手動確認フローを定義する。
- **タイムライン型分離**: Electron Store の保存形式変更が互換性を揺らす可能性 → マイグレーションスクリプトを準備し、旧フォーマットからの移行をサポート。
- **ViewModel 導入**: 短期的にコード量が増えるため、段階的にコンポーネントへ適用し、新旧モデルが混在しないようブランチ統合を慎重に行う。

## 6. 期待効果

- ストリーム層の共通化により再接続や購読ロジックのメンテナンスコストを削減、障害対応時間を短縮。
- タイムラインと投稿データの責務分離で、各プラットフォーム追加時の影響範囲を限定。
- ビルド/テスト基盤の整備により、リファクタリング後の品質確保と開発速度の向上が見込まれます。
