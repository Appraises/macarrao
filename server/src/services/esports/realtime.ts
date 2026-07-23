import { Server } from 'socket.io';

let socketServer: Server | null = null;

export const setEsportsSocketServer = (server: Server) => {
    socketServer = server;
};

export const emitEsportsUpdate = (payload: Record<string, unknown>) => {
    socketServer?.emit('esports:update', {
        ...payload,
        emittedAt: new Date().toISOString(),
    });
};
