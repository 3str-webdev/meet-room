import { LOCAL_VIDEO, useWebRTC } from "@/features/webRTC";
import { useParams } from "react-router-dom";

export const RoomPage = () => {
	const { roomId } = useParams();

	const { clients, provideMediaRef } = useWebRTC({ roomId });

	return (
		<div>
			{clients.map((clientId) => {
				const isMuted = clientId === LOCAL_VIDEO;

				return (
					<div key={clientId}>
						<video
							autoPlay
							playsInline
							ref={(instance) => {
								provideMediaRef(clientId, instance);
							}}
							muted={isMuted}
						/>
					</div>
				);
			})}
		</div>
	);
};
