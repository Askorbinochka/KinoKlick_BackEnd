import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { ConfirmBookingDto } from './dto/confirm-booking.dto.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { TicketsGateway } from './tickets.gateway.js';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly gateway: TicketsGateway,
  ) {}

  async bookSeats(dto: CreateBookingDto, userId?: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: dto.sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Сеанс з id "${dto.sessionId}" не знайдено`);
    }

    const seats = await this.prisma.seat.findMany({
      where: {
        id: { in: dto.seatIds },
        hallId: session.hallId,
      },
    });

    if (seats.length !== dto.seatIds.length) {
      throw new BadRequestException(
        'Деякі з обраних місць не належать залу цього сеансу',
      );
    }

    const soldTicket = await this.prisma.ticket.findFirst({
      where: {
        sessionId: dto.sessionId,
        seatId: { in: dto.seatIds },
      },
    });

    if (soldTicket) {
      throw new BadRequestException(
        'Одне або більше обраних місць вже куплені',
      );
    }

    const activeBooking = await this.prisma.bookingSeat.findFirst({
      where: {
        seatId: { in: dto.seatIds },
        booking: {
          sessionId: dto.sessionId,
          status: 'PENDING',
          expiresAt: { gt: new Date() },
        },
      },
    });

    if (activeBooking) {
      throw new BadRequestException(
        'Одне або більше обраних місць вже тимчасово заброньовані',
      );
    }

    // Атомарне блокування в Redis (TTL 15 хвилин = 900 сек)
    const lockAcquired = await this.redis.lockSeats(
      dto.sessionId,
      dto.seatIds,
      userId ?? 'guest',
      900,
    );

    if (!lockAcquired) {
      throw new BadRequestException(
        'Одне або більше обраних місць вже заблоковані іншим користувачем',
      );
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const booking = await this.prisma.booking.create({
      data: {
        sessionId: dto.sessionId,
        userId,
        expiresAt,
        status: 'PENDING',
        seats: {
          create: dto.seatIds.map((seatId) => ({ seatId })),
        },
      },
      include: {
        session: {
          include: {
            movie: true,
            hall: true,
          },
        },
        seats: {
          include: {
            seat: true,
          },
        },
      },
    });

    // Сповіщення в WebSocket кімнату сеансу: місця заблоковано в реальному часі!
    this.gateway.notifySeatsLocked(dto.sessionId, dto.seatIds);

    return booking;
  }

  async confirmBooking(
    bookingId: string,
    dto?: ConfirmBookingDto,
    userId?: string,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        session: true,
        seats: {
          include: { seat: true },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Бронювання з id "${bookingId}" не знайдено`);
    }

    if (booking.status !== 'PENDING') {
      throw new BadRequestException(
        `Бронювання неможливо підтвердити (поточний статус: ${booking.status})`,
      );
    }

    if (new Date() > booking.expiresAt) {
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'EXPIRED' },
      });

      const seatIds = booking.seats.map((s) => s.seatId);
      await this.redis.releaseSeats(booking.sessionId, seatIds);
      this.gateway.notifySeatsReleased(booking.sessionId, seatIds);

      throw new BadRequestException('Час дії бронювання минув');
    }

    let totalAmount = 0;
    const ticketData = booking.seats.map(({ seat }) => {
      const price =
        seat.type === 'VIP' ? booking.session.price * 1.5 : booking.session.price;
      totalAmount += price;
      return { seatId: seat.id, price };
    });

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId: userId ?? booking.userId,
          bookingId: booking.id,
          totalAmount,
          status: 'PAID',
          customerName: dto?.customerName,
          customerEmail: dto?.customerEmail,
          customerPhone: dto?.customerPhone,
        },
      });

      const tickets = await Promise.all(
        ticketData.map((item) =>
          tx.ticket.create({
            data: {
              sessionId: booking.sessionId,
              seatId: item.seatId,
              orderId: order.id,
              price: item.price,
              qrCode: randomUUID(),
            },
            include: { seat: true },
          }),
        ),
      );

      await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'CONFIRMED' },
      });

      const seatIds = booking.seats.map((s) => s.seatId);
      await this.redis.releaseSeats(booking.sessionId, seatIds);
      this.gateway.notifySeatsSold(booking.sessionId, seatIds);

      const ticketsWithQr = await Promise.all(
        tickets.map(async (t) => ({
          ...t,
          qrCodeImage: t.qrCode
            ? await this.generateQrCodeDataUrl(t.qrCode)
            : null,
        })),
      );

      return {
        order,
        tickets: ticketsWithQr,
      };
    });
  }

  async generateQrCodeDataUrl(text: string): Promise<string> {
    return QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 256,
    });
  }

  async getTicketQrCodeBuffer(ticketId: string): Promise<Buffer> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { qrCode: true },
    });

    if (!ticket || !ticket.qrCode) {
      throw new NotFoundException(`Квиток з id "${ticketId}" не знайдено`);
    }

    return QRCode.toBuffer(ticket.qrCode, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 300,
    });
  }

  async getMyTickets(userId: string) {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        order: { userId },
      },
      include: {
        session: {
          include: {
            movie: true,
            hall: {
              include: {
                cinema: true,
              },
            },
          },
        },
        seat: true,
        order: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return Promise.all(
      tickets.map(async (ticket) => ({
        ...ticket,
        qrCodeImage: ticket.qrCode
          ? await this.generateQrCodeDataUrl(ticket.qrCode)
          : null,
      })),
    );
  }

  async verifyTicket(qrCode: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { qrCode },
      include: {
        session: {
          include: {
            movie: true,
            hall: {
              include: {
                cinema: true,
              },
            },
          },
        },
        seat: true,
        order: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Квиток з QR-кодом "${qrCode}" не знайдено`);
    }

    return {
      ...ticket,
      qrCodeImage: ticket.qrCode
        ? await this.generateQrCodeDataUrl(ticket.qrCode)
        : null,
    };
  }
}


