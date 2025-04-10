import type { APIInteractionResponseCallbackData } from "discord-api-types/v10";
import {
	_channels_$_messages,
	_guilds_$_members_$_roles_$,
	_users_me_channels,
	createRest,
	DiscordHono,
} from "discord-hono";
import { Hono } from "hono";
import {
	alreadyAuthorizedEmbed,
	authorizationSuccessEmbed,
	availableHereEmbed,
	notAuthorizedEmbed,
	openloginPageEmbed,
	unavailableHereEmbed,
} from "./embed";
import {
	createUserRequest,
	createUserState,
	deleteUserRequest,
	getUserRequest,
	getUserState,
	isExpired,
} from "./kv";

type Bindings = {
	KV: KVNamespace<string>;
	REDIRECT_URI: string;
	AUTH_SECRET: string;
	GOOGLE_ID: string;
	GOOGLE_SECRET: string;
	//
	DISCORD_ROLE_ID: string;
	DISCORD_GUILD_ID: string;
	DISCORD_TOKEN: string;
};
type Env = {
	Bindings: Bindings;
	Variables: Record<string, unknown>;
};

const discord = new DiscordHono<Env>();

const grantRole = async (env: Bindings, userId: string) => {
	// manage the role via bot
	await createRest(env.DISCORD_TOKEN)("PUT", _guilds_$_members_$_roles_$, [
		env.DISCORD_GUILD_ID,
		userId,
		env.DISCORD_ROLE_ID,
	]);
};
const sendDM = async (
	env: Bindings,
	userId: string,
	data: APIInteractionResponseCallbackData,
): Promise<void> => {
	const channel = await createRest(env.DISCORD_TOKEN)(
		"POST",
		_users_me_channels,
		[],
		{
			recipient_id: userId,
		},
	);

	const channelId = (await channel.json()).id;
	await createRest(env.DISCORD_TOKEN)(
		"POST",
		_channels_$_messages,
		[
			channelId,
		],
		data,
	);
};

discord
	.command("login", async (c) => {
		const interaction = c.interaction;
		const userId = interaction.user?.id;
		const memberId = interaction.member?.user.id;
		if (!userId) {
			if (memberId) {
				await sendDM(
					c.env,
					memberId,
					{
						embeds: [
							availableHereEmbed("/login"),
						],
					},
				);
			}

			return c.ephemeral().res({
				embeds: [
					unavailableHereEmbed,
				],
			});
		}

		const userState = await getUserState(c.env.KV, userId);
		if (userState) {
			await grantRole(c.env, userId);
			return c.res({
				embeds: [
					alreadyAuthorizedEmbed,
				],
			});
		}

		// send authentication request
		const requestId = await createUserRequest(
			c.env.KV,
			userId,
			60 * 10, // 10 min
		);
		const origin = new URL(c.req.url).origin;

		const url = `${origin}/login?requestId=${requestId}`;

		return c.res(
			{
				embeds: [
					openloginPageEmbed(url),
				],
			},
		);
	})
	.command("status", async (c) => {
		const interaction = c.interaction;
		const userId = interaction.user?.id;
		const memberId = interaction.member?.user.id;
		if (!userId) {
			if (memberId) {
				await sendDM(
					c.env,
					memberId,
					{
						embeds: [
							availableHereEmbed("/status"),
						],
					},
				);
			}
			return c.ephemeral().res(
				{
					embeds: [
						unavailableHereEmbed,
					],
				},
			);
		}

		const userState = await getUserState(c.env.KV, userId);
		if (!userState) {
			return c.res({
				embeds: [
					notAuthorizedEmbed,
				],
			});
		}

		return c.res({
			embeds: [
				alreadyAuthorizedEmbed,
			],
		});
	})
	.command("ping", async (c) => {
		return c.res("pong");
	});

const hono = new Hono<Env>();

hono.get("/login", (c) => {
	const requestId = c.req.query("requestId");
	if (!requestId) {
		return c.text("requestId is required", 400);
	}
	if (c.env.REDIRECT_URI === "" || c.env.REDIRECT_URI === undefined) {
		return c.text("REDIRECT_URI is not set", 500);
	}

	const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
	const params = {
		client_id: c.env.GOOGLE_ID,
		response_type: "code",
		scope: "https://www.googleapis.com/auth/userinfo.profile",
		redirect_uri: c.env.REDIRECT_URI,
		state: requestId,
	};
	return c.redirect(`${AUTH_ENDPOINT}?${new URLSearchParams(params)}`);
});
hono.get("/auth/callback", async (c) => {
	const code = c.req.query("code");
	const requestId = c.req.query("state");

	if (!code || !requestId) {
		return c.text("code and state are required", 400);
	}

	const userRequest = await getUserRequest(c.env.KV, requestId);
	if (!userRequest) {
		return c.text("requestId is not found", 404);
	}
	if (isExpired(userRequest)) {
		return c.text("requestId is expired. Please try again.", 400);
	}

	const tokenEndpoint = "https://oauth2.googleapis.com/token";
	const params = new URLSearchParams({
		code,
		client_id: c.env.GOOGLE_ID,
		client_secret: c.env.GOOGLE_SECRET,
		redirect_uri: c.env.REDIRECT_URI,
		grant_type: "authorization_code",
	});

	const res = await fetch(tokenEndpoint, {
		method: "POST",
		body: params,
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
	});

	const data = await res.json();
	if (!res.ok) {
		return c.text(data.error || "Failed to exchange code for token", 500);
	}

	// success
	// set authenticated
	await deleteUserRequest(c.env.KV, requestId);
	await createUserState(
		c.env.KV,
		userRequest.userId,
		"hogehoge@example.com", // TODO: get email from google?
	);

	// manage the role via bot
	await grantRole(c.env, userRequest.userId);

	// notify user in DM
	await sendDM(
		c.env,
		userRequest.userId,
		{
			embeds: [
				authorizationSuccessEmbed,
			],
		},
	);

	console.log(`User ${userRequest.userId} authenticated successfully.`);

	return c.text("認証成功しました！ ブラウザのタブを閉じることができます。");
});

hono.mount("/bot", discord.fetch);

export default hono;
