import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';

@Controller('notify')
export class NotificationController {
  constructor(private readonly gateway: NotificationGateway) {}

  /**
   * Send notification to a specific user
   * POST /notify/user
   * Body: { userId: string, event: string, payload: any }
   */
  @Post('user')
  @HttpCode(HttpStatus.OK)
  sendToUser(@Body() body: { userId: string; event: string; payload: any }) {
    const delivered = this.gateway.sendToUser(
      body.userId,
      body.event,
      body.payload,
    );
    return { success: true, delivered };
  }

  /**
   * Broadcast to all connected users
   * POST /notify/broadcast
   * Body: { event: string, payload: any }
   */
  @Post('broadcast')
  @HttpCode(HttpStatus.OK)
  broadcast(@Body() body: { event: string; payload: any }) {
    this.gateway.broadcast(body.event, body.payload);
    return { success: true };
  }

  /**
   * Send to a room/group
   * POST /notify/room
   * Body: { room: string, event: string, payload: any }
   */
  @Post('room')
  @HttpCode(HttpStatus.OK)
  sendToRoom(@Body() body: { room: string; event: string; payload: any }) {
    this.gateway.sendToRoom(body.room, body.event, body.payload);
    return { success: true };
  }

  /**
   * Get online status
   * GET /notify/status
   */
  @Post('status')
  @HttpCode(HttpStatus.OK)
  getStatus() {
    return {
      connectedUsers: this.gateway.getConnectedUserCount(),
    };
  }
}
