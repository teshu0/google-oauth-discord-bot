import { Command, register } from "discord-hono";

const commands = [
	new Command("login", "サインイン用のリンクを発行します"), // Sign in to the campus Wi-Fi.
	new Command("status", "現在のサインイン状況を表示します"), // Display the current sign-in status.
	new Command("ping", "Bot がオンラインかどうかを確認します"), // Check if the bot is online.
];

register(
	commands,
	process.env.DISCORD_APPLICATION_ID,
	process.env.DISCORD_TOKEN,
	// process.env.DISCORD_GUILD_ID,
);
