import { HomePage } from "@/pages/home-page";
import { RoomPage } from "@/pages/room-page";
import { createBrowserRouter } from "react-router-dom";

export const router = createBrowserRouter([
	{
		path: "/",
		element: <HomePage />,
	},
	{
		path: "/room/:id",
		element: <RoomPage />,
	},
]);
