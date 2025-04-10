import { Embed } from "discord-hono";

export const notAuthorizedEmbed = new Embed().title(
    "❌ 認証されていません",
).description("認証を行うには、`/login` コマンドを実行してください。").footer({
    text: "認証情報が反映されるまでに 1 分ほどかかる場合があります。",
})
    .color(0xff0000); // red

export const alreadyAuthorizedEmbed = new Embed().title(
    "✅ 認証済み",
).footer({
    text: "既に認証済みです。",
}).color(0x00ff00); // green

export const unavailableHereEmbed = new Embed().title(
    "❌ このコマンドはサーバー内では使用できません！",
).description(
    "DM で使用してください。",
).footer({
    text: "BOT のプロフィールから DM を開くことができます。",
}).color(0xff0000); // red

export const availableHereEmbed = (command: string) =>
    new Embed().title(
        `ℹ️ \`${command}\` コマンドは DM 内で使用できます`,
    ).color(0x0000ff); // blue

export const authorizationSuccessEmbed = new Embed().title(
    "✅ 認証成功",
).description(
    "認証が成功しました。サーバーでロールが付与されていることを確認してください。",
).color(0x00ff00); // green

export const openloginPageEmbed = (url: string) =>
    new Embed().title(
        "🔗 認証ページ",
    ).description(
        `[ここをクリック](${url})して認証ページを開きます`,
    ).url(url)
        .footer({
            text: "リンクは10分間有効です。",
        })
        .color(0x0000ff); // blue
