# Bluesky OAuth (カスタム URI スキーム) 実装計画

## 1. 背景と目的

- デスクトップクライアント DotE において、リダイレクト先 URL をホストできない制約の下で Bluesky OAuth 認証を実現する。
- RFC 8252 推奨のカスタム URI スキームを採用し、ブラウザからアプリへ制御を受け戻すことで、ユーザー入力を最小限に保った認証体験を提供する。

## 2. 要求仕様

1. `client_id` は公開メタデータ JSON（例: `https://example.com/oauth/client-metadata.json`）を用意し、`redirect_uris` にカスタムスキーム `daydream-of-the-elephants://oauth/bluesky/callback` を登録。
2. Electron アプリ側で macOS / Windows の URI プロトコル登録を行い、ブラウザ遷移後に `daydream-of-the-elephants://oauth/bluesky/callback?code=...` が起動できるようにする。
3. メインプロセスは起動時に ①コールバック URI をハンドリングし ②Bluesky OAuth クライアントへリクエストを転送してトークン交換を完了する。
4. 既存のループバックサーバー (`http://127.0.0.1:17600/callback`) はフォールバック動作として温存し、カスタムスキームが未登録の場合に限り利用する。

## 3. 実装ステップ

### 3.1 事前準備

- [ ] カスタムスキーム名を `daydream-of-the-elephants` として登録（アプリ ID / バンドル ID と整合する命名規則を維持）。
- [ ] OAuth クライアントメタデータ JSON をホストし、`redirect_uris` と `grant_types` を更新。
- [ ] Bluesky 側でメタデータの疎通（HTTP 200 / JSON）を確認。

### 3.2 Electron メインプロセス対応

- [ ] `main/index.ts` で `app.setAsDefaultProtocolClient("daydream-of-the-elephants")` を起動時に実行（Windows の再起動要件に注意）。
- [ ] `app.on("open-url")` (macOS) / `app.on("second-instance")` (Windows) で渡される URL を `main/oauth/loopback-server` 相当のハンドラへ転送。
- [ ] 受信したクエリ文字列（`code`, `state` 等）を既存の `NodeOAuthClient.callback` 呼び出しに流用する。
- [ ] 旧ループバックサーバーは `app.isDefaultProtocolClient` が `false` の場合のみ起動する条件分岐を追加。

### 3.3 レンダラ UI / UX

- [ ] 認証開始ボタン押下時に「ブラウザで開く」旨のトースト表示を追加。
- [ ] カスタムスキーム未登録時の案内モーダル（環境設定 > 「資格情報」等）を用意。
- [ ] 認証失敗時にはフォールバック（ローカル HTTP）を提案するダイアログを表示。

### 3.4 テストと検証

- [ ] macOS: `open daydream-of-the-elephants://oauth/bluesky/callback?code=dummy` でアプリが前面復帰し、URL が正しく処理されるか確認。
- [ ] Windows: `start daydream-of-the-elephants://oauth/bluesky/callback?code=dummy` によるハンドリングを確認。必要に応じてインストーラーの `protocols` セクションを更新。
- [ ] Bluesky Sandbox アカウントで実運用テスト。PAR→認可→コールバック→トークン交換まで成功するか検証。
- [ ] 既存利用者への移行策（初回起動時の登録案内、ヘルプへの導線）を作成。

## 4. リスクと対応策

- **OS 権限**: Windows でのプロトコル登録は管理者権限が必要な場合がある。インストーラー設定に `protocols` を追加し、手動登録手順をドキュメント化。
- **アンインストール後の残骸**: スキーム登録解除手続き（`app.removeAsDefaultProtocolClient`）を組み込み、アンインストール手順に明記。
- **ブラウザ互換性**: 一部ブラウザがカスタムスキームを抑止する可能性がある。ユーザーへの案内とフォールバック手順を用意。
- **セキュリティ**: 受信 URL の `state` 検証と `code` の単回使用を徹底し、順序外アクセスは即時破棄。

## 5. 成果物

- カスタム URI スキーム対応の Bluesky OAuth 実装（メインプロセス／レンダラ両方）。
- 更新された OAuth クライアントメタデータとドキュメント（利用者向け登録手順・FAQ）。
- QA チェックリストとリリースノート草案。
