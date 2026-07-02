import { io, Socket } from "socket.io-client";
import { getAccessToken } from "./auth";

let activeSocket: Socket | null = null;

export function connectRealtimeSocket(): Socket {
    if (activeSocket) return activeSocket;
    activeSocket = io("/messaging", {
        path: "/api/socket.io",
        auth: (provideAuth) => provideAuth({ token: getAccessToken() }),
        transports: ["websocket"],
    });
    return activeSocket;
}

export function getRealtimeSocket(): Socket | null {
    return activeSocket;
}

export function disconnectRealtimeSocket(): void {
    activeSocket?.disconnect();
    activeSocket = null;
}
