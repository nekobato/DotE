# DotE Error Handling Plan

## 背景

- 起動時に `mastodon:getInstance` で 500 HTML が返り、`electron-fetch` の `Response.json()` が投げる `Unexpected token '<'` により初期化が中断してしまいますわ。
- Mastodon / Misskey / Bluesky いずれも外部 API へ依存しており、サーバー側障害時でもアプリ起動やローカル設定読み込みは継続できる設計が求められますの。

## 現状把握

- `main/api/mastodon.ts`（および Misskey/Bluesky API）ではレスポンスを無条件に `res.json()` へ渡しており、HTML エラーページや空レスポンスで例外化いたしますの。
- `main/index.ts` の `ipcMain.handle("renderer-event")` では例外をそのまま投げ直すため、`ipcInvoke("api", …)` を呼ぶストア初期化（`src/store/index.ts:initMisskeyEmojis` / `initInstanceMeta` 等）が失敗すると `useStore.init()` 全体が reject され、レンダラ側の初期描画が止まってしまいますわ。
- 既存ログは API 障害の場所を特定しやすくなりましたが、アプリ動作継続までは担保できておりませんの。

## 対応方針（概要）

1. **API 層でのエラー分類とフォールバック**
   - HTTP ステータスや `content-type` を検査し、JSON 以外はテキストとして取り扱った上で `Error` オブジェクトに変換いたしますの。
   - `fetch` 失敗時も含め、`{ type: "network" | "http" | "parse", status, url, bodyPreview }` 形式のエラー情報を付与してレンダラへ返せるよう整備いたしますわ。

2. **IPC 層での例外整形と既定値の返却**
   - `main/index.ts` の `api` ハンドラで、上記エラーを捕捉し `return { error, data: null }` のような統一レスポンスを返すか、もしくは `null` を返す際に `error` を別チャンネルへ通知する戦略を決めますの。
   - レンダラ側は `error` を受け取ってストアの `errors` に push しつつ、起動シーケンスは継続できるようにいたしますわ。

3. **ストア層でのフォールバック処理**
   - `useInstanceStore.getMastodonInstanceMeta` / `createMastodonInstance` など、API 取得結果が `null` or `error` の場合でも `Promise.reject` せずにハンドリングするよう変更いたしますの。
   - 既存インスタンスには `meta: null` を許容しつつ、UI で「インスタンス情報取得に失敗しました」等のガード表示を出すための state を追加しますわ。

4. **UI / UX 面での通知とリトライ導線**
   - 初期化エラーは `store.$state.errors` に積みつつ、トースト or ダイアログで「サーバーが応答しません」などユーザー通知を行う案を固めますの。
   - 後続でリトライ操作（手動 / 自動）を実装できるよう、`useInstanceStore` に `refreshInstanceMeta` などのインターフェイスを用意いたしますわ。

5. **テスト / 検証計画**
   - `electron-fetch` をモックして HTML レスポンス / ステータス 500 / ネットワーク失敗のケースで API ラッパーが期待通りのエラーを返すユニットテストを用意いたしますわ。
   - E2E では `pnpm dev` + モックサーバー (MSW 等) を用いて初期化が完遂し、UI 上にエラー通知だけが表示されることを確認いたしますの。

## 詳細タスク

| 優先度 | カテゴリ | タスク概要 |
| ------ | -------- | ---------- |
| 高 | API | `main/api/{misskey,mastodon,bluesky}.ts` で `handleJsonResponse(res)` ヘルパーを導入し、`content-type` 判別と例外再整形を実装 |
| 高 | IPC | `main/index.ts` の `api` ハンドラで try/catch → `return { ok: true, data } / { ok: false, error }` を統一、ログにも構造化出力 |
| 高 | Store | `useInstanceStore`・`useStore.init*` がエラーを受け取った場合でも `await` が reject しないようガード（null 許容・エラー push） |
| 中 | UI | `src/store/index.ts` or `src/components` でエラー通知の表示方針を整理（Element Plus の `ElNotification` など） |
| 中 | UX | 手動リトライ導線の仕様策定とストア API の追加（別 Issue 化も検討） |
| 中 | Test | API ラッパーのユニットテスト + 初期化フローの統合テストのテストケース洗い出し |

## 残課題 / メモ

- 既存の `useStore.initInstances` などは `Promise.all` 内で例外が発生すると全体が止まるため、タスク実装時に `Promise.allSettled` への変更も視野に入れておりますわ。
- Electron main プロセスでのグローバルハンドラ (`process.on("unhandledRejection")`) を整備し、想定外の失敗でもユーザー通知 + ログ収集できるようにしたいところですの。
- API 応答キャッシュやリトライ戦略は本計画範囲外ですが、障害時のレート制御（指数バックオフ）導入余地がありますわ。

## バリデーション指針

- `pnpm typecheck` を通すこと。
- Mastodon サーバーが 500 を返す状態でアプリ起動 → 起動継続 + エラーログ/通知のみであること。
- Misskey / Bluesky でも同様の障害を模擬し、他プラットフォームの初期化が巻き込まれないことを確認いたしますわ。
