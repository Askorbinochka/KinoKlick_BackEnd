import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class TicketsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(TicketsGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.log(`🔌 Клієнт підключився до WebSocket: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔌 Клієнт відключився від WebSocket: ${client.id}`);
  }

  /**
   * Клієнт приєднується до кімнати конкретного сеансу
   */
  @SubscribeMessage('joinSession')
  handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    if (!data?.sessionId) return;
    const room = `session:${data.sessionId}`;
    client.join(room);
    this.logger.log(`Клієнт ${client.id} увійшов у кімнату ${room}`);
    return { status: 'joined', room };
  }

  /**
   * Клієнт покидає кімнату сеансу
   */
  @SubscribeMessage('leaveSession')
  handleLeaveSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    if (!data?.sessionId) return;
    const room = `session:${data.sessionId}`;
    client.leave(room);
    this.logger.log(`Клієнт ${client.id} покинув кімнату ${room}`);
    return { status: 'left', room };
  }

  /**
   * Сповіщення всім глядачам сеансу: місця тимчасово заблоковано (стали жовтими)
   */
  notifySeatsLocked(sessionId: string, seatIds: string[]) {
    if (!this.server) return;
    const room = `session:${sessionId}`;
    this.logger.log(`📢 Еміт seatsLocked для кімнати ${room}: ${seatIds}`);
    this.server.to(room).emit('seatsLocked', {
      sessionId,
      seatIds,
      status: 'BOOKED',
    });
  }

  /**
   * Сповіщення всім глядачам сеансу: місця звільнено (стали знову зеленими)
   */
  notifySeatsReleased(sessionId: string, seatIds: string[]) {
    if (!this.server) return;
    const room = `session:${sessionId}`;
    this.logger.log(`📢 Еміт seatsReleased для кімнати ${room}: ${seatIds}`);
    this.server.to(room).emit('seatsReleased', {
      sessionId,
      seatIds,
      status: 'AVAILABLE',
    });
  }

  /**
   * Сповіщення всім глядачам сеансу: місця викуплено (стали червоними/сірими)
   */
  notifySeatsSold(sessionId: string, seatIds: string[]) {
    if (!this.server) return;
    const room = `session:${sessionId}`;
    this.logger.log(`📢 Еміт seatsSold для кімнати ${room}: ${seatIds}`);
    this.server.to(room).emit('seatsSold', {
      sessionId,
      seatIds,
      status: 'SOLD',
    });
  }
}
