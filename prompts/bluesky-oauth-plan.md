# Bluesky OAuth 移行計画

## 1. 調査サマリ

### 1.1 Bluesky OAuth 推奨フロー

- Bluesky は Authorization Code + PKCE + PAR (Pushed Authorization Request) を必須とし、認可リクエストは `pushed_authorization_request_endpoint` へのフォーム POST から開始する。
- すべてのクライアントは DPoP (Demonstration of Proof-of-Possession) を利用してアクセストークンを送信し、`Authorization: DPoP <token>` ヘッダーと DPoP JWT を付与する必要がある。
- PKCE は S256 チャレンジメソッドでの実装が必須であり、コードベリファイアを 32〜96 バイトのランダム値から生成する。
- OAuth トークンは PDS (`/xrpc/com.atproto.*`) のみに使用可能で、AppView (`/xrpc/app.bsky.*`) には利用できない。
- 開発用途では `http://localhost` クライアント ID が特例として許可され、コールバック URI はカスタムスキームやローカル HTTP サーバーで受け取れる。

参考リンク:

- https://docs.bsky.app/docs/advanced-guides/oauth-client
- https://atproto.com/specs/oauth
- https://stackoverflow.com/questions/79529947/bluesky-social-oauth-scope-bad-token-scope

### 1.2 Electron デスクトップクライアント適用時の留意点

- 外部ブラウザまたは組み込みライトウェイトブラウザウィンドウで OAuth 認可画面を開き、リダイレクト結果を IPC 経由でレンダラへ返す必要がある。
- PAR・トークン交換・DPoP 証明生成は Node.js (Electron メインプロセス) 側で実行し、PKCE／DPoP に必要な一時的な秘密値はセッションごとに安全に保持する。
- 既存の `AtpAgent` はパスワードベースの `login` を想定しているため、OAuth フローでは `atproto-oauth` などの専用ライブラリ利用や自前実装による DPoP/JWT 生成が必要となる。

参考リンク:

- https://docs.bsky.app/docs/advanced-guides/oauth-client
- https://classic.yarnpkg.com/en/package/%40atproto/api
- https://socket.dev/npm/package/bluesky-oauth-kit
- https://www.npmjs.com/package/%40atproto/oauth-client-browser

### 1.3 リファレンス

- [Bluesky Docs: OAuth Client Implementation](https://docs.bsky.app/docs/advanced-guides/oauth-client)
- [AT Protocol OAuth Specification](https://atproto.com/specs/oauth)
- [Stack Overflow: Bluesky OAuth scope / DPoP 実装知見](https://stackoverflow.com/questions/79529947/bluesky-social-oauth-scope-bad-token-scope)
- [bluesky-oauth-kit (Node)](https://socket.dev/npm/package/bluesky-oauth-kit)
- [@atproto/oauth-client-browser](https://www.npmjs.com/package/%40atproto/oauth-client-browser)

## 2. 現行実装調査結果

### 2.1 認証フロー (Bluesky)

- `src/components/Settings/AddAccountBluesky.vue:1-95` でユーザー名／パスワードを入力させ、`ipcInvoke("api", { method: "bluesky:login" })` を呼び出し。ログイン成功後 `bluesky:getProfile` を取得し、Pinia ストアへユーザーを登録。
- `main/api/bluesky.ts:1-118` では `AtpAgent` の `login` を使いパスワードでセッションを確立。`AtpAgent` のセッション更新 (`refreshSession`) を独自実装し、アクセストークン・リフレッシュトークンを更新。
- タイムライン取得・投稿・リアクション等は `main/api/bluesky.ts` の各関数が `AtpAgent` に対する `resumeSession` や REST 呼び出しで対応。

### 2.2 資格情報の永続化

- `main/db.ts:264-315` で `electron-store` に保存する際に `safeStorage` を用いて `token`, `blueskySession.accessJwt`, `blueskySession.refreshJwt` を Base64 で暗号化保存。
- `src/store/users.ts:66-123` でユーザー登録時に `blueskySession` を含めて `db:upsert-user` へ渡し、ストア初期化後にタイムラインを作成。

### 2.3 課題整理

- パスワード直接入力による `com.atproto.server.createSession` 依存は Bluesky の最新方針と不一致であり、将来的に API 制限リスク。
- 現行実装では DPoP/JWT 未対応のため OAuth トークンでは API 呼び出しできない。
- UI はハンドル・パスワード入力前提であり、OAuth 遷移 UI が存在しない。
- 永続化スキーマは `blueskySession` にアクセストークンとリフレッシュトークンを保持するが、OAuth で必要となる DPoP キーや `scope`、`token_type` といった追加メタが保存されていない。

## 3. 実装計画

### 3.1 設計方針

- 認証フローを OAuth Authorization Code + PKCE + PAR + DPoP へ全面移行し、パスワード入力 UI は廃止。
- Electron メインプロセスで OAuth クライアント機能を実装し、レンダラは「ログイン開始」トリガーと結果受領のみを担当。
- DPoP キー管理・PKCE コードベリファイアの生成はメインプロセスで行い、セッションごとに `electron-store` へ暗号化保存する。

### 3.2 実装ステップ (TDD 方針)

1. **準備**: Bluesky OAuth クライアント登録（メタデータ JSON とクライアント ID）。開発用には `http://localhost` を利用し、Electron 用のカスタム URI またはローカルコールバックサーバーを設計。
2. **ユーティリティ層追加**: メインプロセス用に PKCE・DPoP 用の純関数ユーティリティ (`main/utils/oauth.ts` 等) を実装し、Node.js 向け暗号モジュールでテスト（Vitest 追加を検討）。TDD としてユニットテストから着手。
3. **OAuth フロー実装**:
   - PAR リクエスト・認可 URL 生成・ブラウザ起動・コールバック受領までを `main/api/bluesky-oauth.ts` (新規) として実装。
   - Electron メインプロセスで外部ブラウザ起動 (`shell.openExternal`) または `BrowserWindow` で認可画面を表示し、リダイレクト先で結果を受領（`protocol` モジュールやローカル HTTP サーバーで処理）。
   - トークン交換時に DPoP ヘッダーを付加する HTTP クライアントを整備。
4. **API 呼び出しの OAuth 対応**: 既存の `AtpAgent` 依存コードを OAuth トークン + DPoP 対応クライアントへ置き換え。`main/api/bluesky.ts` を段階的にリファクタし、アクセストークン更新は OAuth `token` エンドポイント経由に変更。
5. **ストア・DB 更新**: `shared/types/store.d.ts` と `main/db.ts` を更新し、`blueskySession` に DPoP キー (JWK)、`token_type`, `scope`, `expires_at` 等を追加。既存データ移行用マイグレーション（初回起動時にパスワードセッションを無効化し再ログインを促す）を実装。
6. **UI 更新**: `src/components/Settings/AddAccountBluesky.vue` を OAuth 専用 UI に刷新。ユーザーには「ブラウザで開く → 許可 → 連携完了」フローを案内。進捗表示・エラー表示を追加。
7. **後方互換対策**: 既存パスワード認証ユーザーには警告を表示し、ログイン情報を再取得させる。必要に応じて旧 `blueskySession` を破棄。
8. **テスト & 検証**: 新規ユニットテスト (PKCE/DPoP 生成、トークンリフレッシュロジック)、`pnpm typecheck`。可能であればエンドツーエンドの手動確認手順書を更新。

### 3.3 影響範囲・移行戦略

- **メインプロセス**: `main/api/bluesky.ts` の大幅改修、OAuth 専用モジュール追加、IPC インターフェース更新。
- **レンダラ**: 設定画面 (`AddAccountBluesky.vue`)、ユーザー追加フロー、エラーハンドリングの改修。
- **共通型**: `shared/types/store.d.ts` でセッション情報拡張。IPC 型 (`shared/types/ipc`) の更新。
- **データ移行**: 起動時に旧形式 (`refreshJwt`/`accessJwt` のみ) を検出した場合、OAuth 再ログインを必須化し安全に破棄。

### 3.4 検証計画

- コマンド: `pnpm typecheck`（必須）、必要に応じて新設の `pnpm test` でユニットテストを実行。
- 手動チェック: OAuth 認証完了、タイムライン・投稿・リアクション操作が成功すること。トークン期限切れ時の自動リフレッシュ、DID 不一致時のエラー確認。
- セキュリティ確認: DPoP キーがユーザーごとに保存され、別ユーザー／セッションで再利用されないことを確認。

### 3.5 リスクと対応策

- **DPoP 実装複雑度**: 専用ライブラリ (`atproto-oauth` / `bluesky-oauth-kit`) の利用検討と、Fallback としての自前実装スケジュール確保。
- **ブラウザ起動制御**: 外部ブラウザに依存する場合、リダイレクト URI 処理のクロスプラットフォーム差異を考慮。代替としてアプリ内 `BrowserWindow` での埋め込み案を比較。
- **ユーザー体験**: 既存ユーザーへの移行通知（初回起動時のモーダル警告）を追加し、移行中の投稿失敗リスクを低減。
- **API 変更追従**: Bluesky OAuth 仕様は進化途上のため、公式ドキュメント更新の定期監視を計画（少なくとも月次で確認）。

---

以上を実装計画ドラフトとし、着手前にクライアント登録情報とリダイレクト受領方式について最終確認する。
