import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: 'notifications',
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  /** Map userId -> Set of socket ids */
  private userSockets: Map<string, Set<string>> = new Map();

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);
      this.logger.log(`User ${userId} connected (socket ${client.id})`);
    } else {
      this.logger.warn(`Client ${client.id} connected without userId`);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId)!.delete(client.id);
      if (this.userSockets.get(userId)!.size === 0) {
        this.userSockets.delete(userId);
      }
      this.logger.log(`User ${userId} disconnected (socket ${client.id})`);
    }
  }

  /**
   * Send a notification to a specific user
   */
  sendToUser(userId: string, event: string, payload: any): boolean {
    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.size === 0) {
      this.logger.debug(
        `User ${userId} is not connected, notification not sent`,
      );
      return false;
    }
    sockets.forEach((socketId) => {
      this.server.to(socketId).emit(event, payload);
    });
    this.logger.debug(
      `Sent "${event}" to user ${userId} (${sockets.size} socket(s))`,
    );
    return true;
  }

  /**
   * Send a notification to all connected users
   */
  broadcast(event: string, payload: any): void {
    this.server.emit(event, payload);
    this.logger.debug(`Broadcast "${event}" to all connected clients`);
  }

  /**
   * Send to users in a specific room/group
   */
  sendToRoom(room: string, event: string, payload: any): void {
    this.server.to(room).emit(event, payload);
    this.logger.debug(`Sent "${event}" to room ${room}`);
  }

  /**
   * Check if a user is currently connected
   */
  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return !!sockets && sockets.size > 0;
  }

  /**
   * Get count of connected users
   */
  getConnectedUserCount(): number {
    return this.userSockets.size;
  }
}
