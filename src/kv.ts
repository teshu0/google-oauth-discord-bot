interface UserState {
	userId: string; // discord user
	createdAt: number;
	email: string;
}

interface UserRequest {
	userId: string; // discord user
	createdAt: number;
	expiredAt: number;
}

const generateRequestId = () => {
	const id = crypto.randomUUID();
	return id;
};

export const createUserRequest = async (
	kv: KVNamespace,
	userId: string,
	seconds: number,
) => {
	const requestId = generateRequestId();
	const userRequest: UserRequest = {
		userId,
		createdAt: Date.now(),
		expiredAt: Date.now() + seconds * 1000,
	};
	await kv.put(requestId, JSON.stringify(userRequest), {
		expirationTtl: seconds,
	});
	return requestId;
};

export const getUserRequest = async (
	kv: KVNamespace,
	requestId: string,
): Promise<UserRequest | null> => {
	const userRequest = await kv.get(requestId, {
		cacheTtl: 60,
	});
	if (!userRequest) return null;
	return JSON.parse(userRequest) as UserRequest;
};

export const isExpired = (userRequest: UserRequest): boolean => {
	const now = Date.now();
	return now > userRequest.expiredAt;
};

export const deleteUserRequest = async (
	kv: KVNamespace,
	requestId: string,
): Promise<void> => {
	await kv.delete(requestId);
};

export const createUserState = async (
	kv: KVNamespace,
	userId: string,
	email: string,
): Promise<void> => {
	const userState: UserState = {
		userId,
		createdAt: Date.now(),
		email,
	};
	await kv.put(userId, JSON.stringify(userState));
};

export const getUserState = async (
	kv: KVNamespace,
	userId: string,
): Promise<UserState | null> => {
	const userState = await kv.get(userId, {
		cacheTtl: 60,
	});
	if (!userState) return null;
	return JSON.parse(userState) as UserState;
};

export const deleteUserState = async (
	kv: KVNamespace,
	userId: string,
): Promise<void> => {
	await kv.delete(userId);
};
