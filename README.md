## Google OAuth & Discord BOT ロール付与

このプロジェクトは、Cloudflare Workers 上で動作する Discord ボットを実装します。このボットは、Google OAuth を介してユーザーを認証し、認証成功時に Discord サーバー上の特定のロールを付与します。認証状態の管理には Cloudflare KV を利用します。

### 機能

*   `discord-hono` を使用して Discord スラッシュコマンド (`/login`, `/status`, `/ping`) を処理します。
*   Google OAuth2 認証フローを実装します。
*   一時的な認証リクエストと永続的なユーザー状態を Cloudflare KV に保存します ([`src/kv.ts`](src/kv.ts))。
*   認証成功時に、設定された Discord ロールを自動的に付与します。
*   認証リンクやステータス更新のために、ユーザーにダイレクトメッセージ (DM) を送信します。

### セットアップ

1.  **リポジトリをクローンします。**
2.  **依存関係をインストールします:**
    ```sh
    bun install
    ```
3.  **Cloudflare KV を設定します:**
    *   Cloudflare ダッシュボードで KV 名前空間を作成します。
    *   [`wrangler.toml`](wrangler.toml) に名前空間バインディングを追加します:
        ```toml
        # filepath: wrangler.toml
        [[kv_namespaces]]
        binding = "KV"
        id = "<your_kv_namespace_id>"
        ```
4.  **環境変数を設定します:**
    *   [`.example.vars`](.example.vars) をコピーして環境ファイルを作成します。
    *   **ローカル開発 (`wrangler dev`) の場合:** `.dev.vars` ファイルを作成します。
    *   **コマンド登録 (`bun run register`) の場合:** `.env.local` ファイルを作成します。
    *   **デプロイ (`wrangler deploy`) の場合:** Cloudflare ダッシュボードでシークレットを設定します。
    *   必要な変数:
        *   `GOOGLE_ID`: Google OAuth クライアント ID。
        *   `GOOGLE_SECRET`: Google OAuth クライアントシークレット。
        *   `REDIRECT_URI`: Google OAuth のコールバック URL (例: `https://<your-worker-url>/auth/callback` またはローカル開発用の `http://localhost:8787/auth/callback`)。
        *   `DISCORD_APPLICATION_ID`: Discord アプリケーション ID。
        *   `DISCORD_PUBLIC_KEY`: Discord アプリケーション公開鍵。
        *   `DISCORD_TOKEN`: Discord ボットトークン。
        *   `DISCORD_GUILD_ID`: Discord サーバー (ギルド) の ID。
        *   `DISCORD_ROLE_ID`: 付与する Discord ロールの ID。

### 使用方法

1.  **スラッシュコマンドを登録します:**
    *   `.env.local` が Discord ボットの認証情報で設定されていることを確認します。
    *   [`package.json`](package.json) で定義された登録スクリプトを実行します:
        ```sh
        bun run register
        ```
    *   このスクリプト ([`src/register.ts`](src/register.ts)) は、`/login`、`/status`、`/ping` コマンドをグローバルに登録します。

2.  **ローカルで実行します:**
    *   `.dev.vars` が設定されていることを確認します。
    *   [`package.json`](package.json) のスクリプトを使用して開発サーバーを起動します:
        ```sh
        bun run dev
        ```
    *   これにより、通常は `http://localhost:8787` でローカルサーバーが起動します。
    *   (BOT はローカルで動作しませんが、`/login` パスにアクセスして、 Google 認証フローをテストできます。)

3.  **Cloudflare Workers にデプロイします:**
    *   Cloudflare ダッシュボードでシークレットが設定されていることを確認します。
    *   [`package.json`](package.json) のスクリプトを使用してワーカーをデプロイします:
        ```sh
        bun run deploy
        ```
    *   Discord BOT の Interactions Endpoint URL を Cloudflare Workers の URL に設定します。たとえば、`https://<your-worker-url>.dev/bot` のようにします。(`/bot` は、Discord のエンドポイントです。)

### Discord コマンド

*   `/login`: Google OAuth 認証フローを開始します。ボットは一意の認証リンクを含む DM を送信します。このリンクは 10 分間有効です。
*   `/status`: コマンドを実行したユーザーが既に認証されているかを確認します。
*   `/ping`: ボットがオンラインで応答可能かを確認するための簡単なコマンドです。"pong" と応答します。

### 認証フロー ([`src/index.ts`](src/index.ts))

1.  ユーザーがボットとの DM で `/login` コマンドを実行します。
2.  ボットは一意の `requestId` を生成し、ユーザーの Discord ID と有効期限とともに KV に保存します ([`createUserRequest`](src/kv.ts))。
3.  ボットはユーザーに `<worker_url>/login?requestId=<requestId>` のようなリンクを含む DM を送信します。
4.  ユーザーがリンクをクリックします。`/login` エンドポイントはユーザーを Google OAuth 同意画面にリダイレクトします。
5.  ユーザーがアプリケーションを承認すると、Google は認証 `code` と元の `requestId` (`state` として) を付けてユーザーを `REDIRECT_URI` (`/auth/callback`) にリダイレクトします。
6.  `/auth/callback` ハンドラは KV に対して `requestId` を検証します ([`getUserRequest`](src/kv.ts), [`isExpired`](src/kv.ts))。
7.  `code` を Google と交換してアクセストークンを取得します。
8.  ボットは永続的なユーザー状態を KV に保存し、Discord ユーザー ID を認証済みステータスとリンクします ([`createUserState`](src/kv.ts))。一時的なリクエスト ID は削除されます ([`deleteUserRequest`](src/kv.ts))。
9.  ボットは設定された Discord ロールをユーザーに付与します ([`grantRole`](src/index.ts))。
10. ボットは確認の DM をユーザーに送信します ([`sendDM`](src/index.ts))。
11. ユーザーはブラウザでも成功メッセージを確認できます。
