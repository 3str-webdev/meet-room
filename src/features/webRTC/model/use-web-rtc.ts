import { useStateWithCallback } from "@/shared/hooks";
import { ACTIONS, socket } from "@/shared/socket";
import { useCallback, useEffect, useRef } from "react";
import { LOCAL_VIDEO } from "../constants";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import freeice from "freeice";

type UseWebRTCOptions = {
	roomId?: string;
};

export const useWebRTC = ({ roomId }: UseWebRTCOptions) => {
	const [clients, updateClients] = useStateWithCallback<string[]>([]);

	const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
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
		const handleAddPeer = async ({
			peerId,
			createOffer,
		}: { peerId: string; createOffer: boolean }) => {
			if (peerId in peerConnections.current) {
				return console.warn("Already connected to peer", peerId);
			}

			peerConnections.current[peerId] = new RTCPeerConnection({
				iceServers: freeice(),
			});

			peerConnections.current[peerId].onicecandidate = (event) => {
				if (event.candidate) {
					socket.emit(ACTIONS.RELAY_ICE, {
						peerId,
						iceCandidate: event.candidate,
					});
				}
			};

			let tracksNumber = 0;
			peerConnections.current[peerId].ontrack = ({
				streams: [remoteStream],
			}) => {
				++tracksNumber;

				// Не добавляем видео пользователя если у него не транслируются видео или аудио
				if (tracksNumber < 2) return;

				// Добавляем пользователя в комнату и рендерим его в видео
				addNewClient(peerId, () => {
					const videoElement = peerMediaElements.current[peerId];

					if (!videoElement) return;

					videoElement.srcObject = remoteStream;
				});
			};

			const stream = localMediaStream.current;

			if (stream) {
				for (const track of stream.getTracks()) {
					peerConnections.current[peerId].addTrack(track, stream);
				}
			}

			if (createOffer) {
				const offer = await peerConnections.current[peerId].createOffer();
				await peerConnections.current[peerId].setLocalDescription(offer);
				socket.emit(ACTIONS.RELAY_SDP, {
					peerId,
					sessionDescription: offer,
				});
			}
		};

		socket.on(ACTIONS.ADD_PEER, handleAddPeer);
	}, [addNewClient]);

	// Реагируем на новый Offer
	useEffect(() => {
		const setRemoteMedia = async ({
			peerId,
			sessionDescription,
		}: { peerId: string; sessionDescription: RTCSessionDescription }) => {
			const remoteDescription = sessionDescription;

			await peerConnections.current[peerId].setRemoteDescription(
				new RTCSessionDescription(remoteDescription),
			);

			if (remoteDescription.type === "offer") {
				const answer = await peerConnections.current[peerId].createAnswer();
				await peerConnections.current[peerId].setLocalDescription(answer);
				socket.emit(ACTIONS.RELAY_SDP, { peerId, sessionDescription: answer });
			}
		};

		socket.on(ACTIONS.SESSION_DESCRIPTION, setRemoteMedia);
	}, []);

	// Реагируем на новый IceCandidate
	useEffect(() => {
		socket.on(
			ACTIONS.ICE_CANDIDATE,
			({
				peerId,
				iceCandidate,
			}: { peerId: string; iceCandidate: RTCIceCandidate }) => {
				peerConnections.current[peerId].addIceCandidate(
					new RTCIceCandidate(iceCandidate),
				);
			},
		);
	}, []);

	// Реагируем на отключение пользователя
	useEffect(() => {
		const handleRemovePeer = ({ peerId }: { peerId: string }) => {
			if (!peerConnections.current[peerId]) return;

			peerConnections.current[peerId].close();
			delete peerConnections.current[peerId];
			delete peerMediaElements.current[peerId];

			updateClients(
				(prev) => {
					return prev.filter((item) => item !== peerId);
				},
				() => {},
			);
		};

		socket.on(ACTIONS.REMOVE_PEER, handleRemovePeer);
	}, [updateClients]);

	useEffect(() => {
		// Захват изображения и аудио себя
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
					localVideoElement.onloadedmetadata = () => {
						localVideoElement.play();
					};
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

		// Реализация выхода из комнаты если поменялся roomId
		return () => {
			const stream = localMediaStream.current;

			if (!stream) return;

			for (const track of stream.getTracks()) {
				track.stop();
			}

			socket.emit(ACTIONS.LEAVE);
		};
	}, [addNewClient, roomId]);

	const provideMediaRef = useCallback(
		(clientId: string, node: HTMLVideoElement | null) => {
			peerMediaElements.current[clientId] = node;
		},
		[],
	);

	return { clients: clients as string[], provideMediaRef };
};
