import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { ConfirmBookingDto } from './dto/confirm-booking.dto.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';


@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

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

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    return this.prisma.booking.create({
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

      return {
        order,
        tickets,
      };
    });
  }

  async getMyTickets(userId: string) {
    return this.prisma.ticket.findMany({
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

    return ticket;
  }
}


