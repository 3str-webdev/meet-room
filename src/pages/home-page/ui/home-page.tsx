import { ACTIONS, socket } from "@/shared/socket";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuid } from "uuid";

export const HomePage = () => {
	const navigate = useNavigate();
	const [rooms, setRooms] = useState<string[]>([]);
	const rootNodeRef = useRef<HTMLDivElement>(null);

	const handleCreateRoomClick = () => {
		const roomId = uuid();
		navigate(`/room/${roomId}`);
	};

	const handleJoinRoomClick = (roomId: string) => {
		navigate(`/room/${roomId}`);
	};

	useEffect(() => {
		socket.on(ACTIONS.SHARE_ROOMS, ({ rooms }: { rooms: string[] }) => {
			if (rootNodeRef.current) {
				setRooms(rooms);
			}
		});
	}, []);

	return (
		<div ref={rootNodeRef}>
			<h1>Available Rooms</h1>
			<button type="button" onClick={handleCreateRoomClick}>
				Create new room
			</button>
			<ul>
				{rooms.map((roomId) => (
					<li key={roomId}>
						{roomId}
						<button type="button" onClick={() => handleJoinRoomClick(roomId)}>
							Join room
						</button>
					</li>
				))}
			</ul>
		</div>
	);
};
