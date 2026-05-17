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
  server!: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  /** Map userId/username -> Set of socket ids */
  private userSockets: Map<string, Set<string>> = new Map();

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    const username = client.handshake.query.username as string;

    if (userId) {
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);
      this.logger.log(`User ${userId} connected (socket ${client.id})`);
    }

    if (username && username !== userId) {
      if (!this.userSockets.has(username)) {
        this.userSockets.set(username, new Set());
      }
      this.userSockets.get(username)!.add(client.id);
      this.logger.log(
        `User ${username} connected by username (socket ${client.id})`,
      );
    }

    if (!userId && !username) {
      this.logger.warn(
        `Client ${client.id} connected without userId or username`,
      );
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId as string;
    const username = client.handshake.query.username as string;

    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId)!.delete(client.id);
      if (this.userSockets.get(userId)!.size === 0) {
        this.userSockets.delete(userId);
      }
      this.logger.log(`User ${userId} disconnected (socket ${client.id})`);
    }

    if (username && this.userSockets.has(username)) {
      this.userSockets.get(username)!.delete(client.id);
      if (this.userSockets.get(username)!.size === 0) {
        this.userSockets.delete(username);
      }
    }
  }

  /**
   * Send a notification to a specific user.
   * Returns true if user is online and message was sent.
   */
  sendToUser(userId: string, event: string, payload: any): boolean {
    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.size === 0) {
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
   * Send a notification to multiple user IDs (tries each key).
   * Returns true if at least one was online and received the message.
   */
  sendToAnyUser(userIds: string[], event: string, payload: any): boolean {
    let sent = false;
    for (const id of userIds) {
      if (this.sendToUser(id, event, payload)) {
        sent = true;
      }
    }
    return sent;
  }

  broadcast(event: string, payload: any): void {
    this.server.emit(event, payload);
    this.logger.debug(`Broadcast "${event}" to all connected clients`);
  }

  sendToRoom(room: string, event: string, payload: any): void {
    this.server.to(room).emit(event, payload);
    this.logger.debug(`Sent "${event}" to room ${room}`);
  }

  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return !!sockets && sockets.size > 0;
  }

  /**
   * Check if user is online by any of their IDs (userId or username)
   */
  isAnyUserOnline(userIds: string[]): boolean {
    return userIds.some((id) => this.isUserOnline(id));
  }

  getConnectedUserCount(): number {
    return this.userSockets.size;
  }
}
