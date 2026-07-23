import type { Notification } from '@prisma/client';
import type { Server } from 'socket.io';

let socketServer: Server | null = null;

export const setRealtimeSocketServer = (server: Server) => {
    socketServer = server;
};

export const emitUserNotification = (notification: Notification) => {
    socketServer?.to(`user:${notification.userId}`).emit('notification:new', notification);
};

export const emitContributionQueueUpdate = (payload: { termId: string; status: string; revision: number }) => {
    socketServer?.to('admins').emit('contribution:update', payload);
};
