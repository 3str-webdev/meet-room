import { useStateWithCallback } from "@/shared/hooks";
import { ACTIONS, socket } from "@/shared/socket";
import { useCallback, useEffect, useRef } from "react";
import { LOCAL_VIDEO } from "../constants";

type UseWebRTCOptions = {
	roomId?: string;
};

export const useWebRTC = ({ roomId }: UseWebRTCOptions) => {
	const [clients, updateClients] = useStateWithCallback<string[]>([]);

	const peerConnections = useRef({});
	const localMediaStream = useRef<MediaStream | null>(null);
	const peerMediaElements = useRef<Record<string, HTMLVideoElement | null>>({
		[LOCAL_VIDEO]: null,
	});

	const addNewClient = useCallback(
		(newClient: string, cb: (client: string[]) => void) => {
			updateClients((prevClients: string[]) => {
				if (!prevClients.includes(newClient)) {
					return [...prevClients, newClient];
				}
				return prevClients;
			}, cb);
		},
		[updateClients],
	);

	useEffect(() => {
		const startCapture = async () => {
			localMediaStream.current = await navigator.mediaDevices.getUserMedia({
				audio: true,
				video: true,
			});

			addNewClient(LOCAL_VIDEO, () => {
				const localVideoElement = peerMediaElements.current[LOCAL_VIDEO];
				if (localVideoElement) {
					localVideoElement.volume = 0;
					localVideoElement.srcObject = localMediaStream.current;
					console.log(localVideoElement);
				}
			});
		};

		startCapture()
			.then(() => {
				socket.emit(ACTIONS.JOIN, { room: roomId });
			})
			.catch((error: Error) => {
				console.error("Error getting user media", error);
			});
	}, [addNewClient, roomId]);

	const provideMediaRef = useCallback(
		(clientId: string, node: HTMLVideoElement | null) => {
			peerMediaElements.current[clientId] = node;
		},
		[],
	);

	return { clients: clients as string[], provideMediaRef };
};
