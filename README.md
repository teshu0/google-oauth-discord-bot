## Google OAuth & Discord BOT Role Granting

This project implements a Discord bot running on Cloudflare Workers that authenticates users via Google OAuth and grants a specific role on a Discord server upon successful authentication. It utilizes Cloudflare KV to manage authentication states.

### Features

*   Handles Discord slash commands (`/signin`, `/status`, `/ping`) using `discord-hono`.
*   Implements Google OAuth2 authentication flow.
*   Stores temporary authentication requests and persistent user states in Cloudflare KV ([`src/kv.ts`](src/kv.ts)).
*   Automatically grants a configured Discord role upon successful authentication.
*   Sends Direct Messages (DMs) to users for authentication links and status updates.

### Setup

1.  **Clone the repository.**
2.  **Install dependencies:**
    ```sh
    bun install
    ```
3.  **Configure Cloudflare KV:**
    *   Create a KV namespace in your Cloudflare dashboard.
    *   Add the namespace binding to [`wrangler.toml`](wrangler.toml):
        ```toml
        # filepath: wrangler.toml
        [[kv_namespaces]]
        binding = "KV"
        id = "<your_kv_namespace_id>"
        ```
4.  **Configure Environment Variables:**
    *   Copy [`.example.vars`](.example.vars) to create environment files.
    *   **For local development (`wrangler dev`):** Create a `.dev.vars` file.
    *   **For command registration (`bun run register`):** Create a `.env.local` file.
    *   **For deployment (`wrangler deploy`):** Configure secrets in the Cloudflare dashboard.
    *   Required variables:
        *   `GOOGLE_ID`: Your Google OAuth Client ID.
        *   `GOOGLE_SECRET`: Your Google OAuth Client Secret.
        *   `REDIRECT_URI`: The callback URL for Google OAuth (e.g., `https://<your-worker-url>/auth/callback` or `http://localhost:8787/auth/callback` for local dev).
        *   `AUTH_SECRET`: A secret string for potential future use (currently unused).
        *   `DISCORD_APPLICATION_ID`: Your Discord application ID.
        *   `DISCORD_PUBLIC_KEY`: Your Discord application public key.
        *   `DISCORD_TOKEN`: Your Discord bot token.
        *   `DISCORD_GUILD_ID`: The ID of the Discord server (guild).
        *   `DISCORD_ROLE_ID`: The ID of the Discord role to grant.

### Usage

1.  **Register Slash Commands:**
    *   Ensure `.env.local` is configured with your Discord bot credentials.
    *   Run the registration script defined in [`package.json`](package.json):
        ```sh
        bun run register
        ```
    *   This script ([`src/register.ts`](src/register.ts)) registers the `/signin`, `/status`, and `/ping` commands globally or for a specific test guild if `DISCORD_TEST_GUILD_ID` is set in `.env.local`.

2.  **Run Locally:**
    *   Ensure `.dev.vars` is configured.
    *   Start the development server using the script in [`package.json`](package.json):
        ```sh
        bun run dev
        ```
    *   This will start a local server, typically on `http://localhost:8787`.

3.  **Deploy to Cloudflare Workers:**
    *   Ensure secrets are configured in the Cloudflare dashboard.
    *   Deploy the worker using the script in [`package.json`](package.json):
        ```sh
        bun run deploy
        ```

### Discord Commands

*   `/signin`: Initiates the Google OAuth authentication flow. The bot sends a DM containing a unique authentication link. This link is valid for 10 minutes.
*   `/status`: Checks if the user running the command is already authenticated and has the role.
*   `/ping`: A simple command to check if the bot is online and responsive. Responds with "pong".

### Authentication Flow ([`src/index.ts`](src/index.ts))

1.  A user runs the `/signin` command in a DM with the bot.
2.  The bot generates a unique `requestId`, stores it in KV along with the user's Discord ID and an expiration time ([`createUserRequest`](src/kv.ts)).
3.  The bot sends a DM to the user with a link like `<worker_url>/signin?requestId=<requestId>`.
4.  The user clicks the link. The `/signin` endpoint redirects the user to the Google OAuth consent screen.
5.  After the user authorizes the application, Google redirects the user back to the `REDIRECT_URI` (`/auth/callback`) with an authorization `code` and the original `requestId` (as `state`).
6.  The `/auth/callback` handler validates the `requestId` against KV ([`getUserRequest`](src/kv.ts), [`isExpired`](src/kv.ts)).
7.  It exchanges the `code` with Google for an access token.
8.  *(TODO: Fetch user's email/profile information from Google using the access token).*
9.  The bot stores a persistent user state in KV, linking the Discord User ID to their authenticated status and email ([`createUserState`](src/kv.ts)). The temporary request ID is deleted ([`deleteUserRequest`](src/kv.ts)).
10. The bot grants the configured Discord role to the user ([`grantRole`](src/index.ts)).
11. The bot sends a confirmation DM to the user ([`sendDM`](src/index.ts)).
12. The user sees a success message in their browser.


