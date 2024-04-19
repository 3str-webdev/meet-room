import { io } from "socket.io-client";

const options = {
	"force new connection": true,
	reconnectionAttempts: Number.POSITIVE_INFINITY,
	timeout: 10 * 1000,
	transports: ["websocket"],
};

export const socket = io("ws://localhost:3001", options);

export { ACTIONS } from "./actions";
