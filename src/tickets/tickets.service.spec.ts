import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { TicketsGateway } from './tickets.gateway.js';
import { TicketsService } from './tickets.service.js';

describe('TicketsService', () => {
  let service: TicketsService;
  let redis: {
    lockSeats: ReturnType<typeof vi.fn>;
    releaseSeats: ReturnType<typeof vi.fn>;
  };
  let gateway: {
    notifySeatsLocked: ReturnType<typeof vi.fn>;
    notifySeatsReleased: ReturnType<typeof vi.fn>;
    notifySeatsSold: ReturnType<typeof vi.fn>;
  };
  let prisma: {
    session: { findUnique: ReturnType<typeof vi.fn> };
    seat: { findMany: ReturnType<typeof vi.fn> };
    ticket: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
    };
    bookingSeat: { findFirst: ReturnType<typeof vi.fn> };
    booking: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    order: { create: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    redis = {
      lockSeats: vi.fn().mockResolvedValue(true),
      releaseSeats: vi.fn().mockResolvedValue(undefined),
    };

    gateway = {
      notifySeatsLocked: vi.fn(),
      notifySeatsReleased: vi.fn(),
      notifySeatsSold: vi.fn(),
    };

    prisma = {
      session: { findUnique: vi.fn() },
      seat: { findMany: vi.fn() },
      ticket: { findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
      bookingSeat: { findFirst: vi.fn() },
      booking: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
      order: { create: vi.fn() },
      $transaction: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: RedisService,
          useValue: redis,
        },
        {
          provide: TicketsGateway,
          useValue: gateway,
        },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('bookSeats', () => {
    const bookingDto: CreateBookingDto = {
      sessionId: 'session-1',
      seatIds: ['seat-1', 'seat-2'],
    };

    it('повинен успішно забронювати місця', async () => {
      prisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        hallId: 'hall-1',
      });
      prisma.seat.findMany.mockResolvedValue([
        { id: 'seat-1', hallId: 'hall-1' },
        { id: 'seat-2', hallId: 'hall-1' },
      ]);
      prisma.ticket.findFirst.mockResolvedValue(null);
      prisma.bookingSeat.findFirst.mockResolvedValue(null);

      const createdBooking = {
        id: 'booking-1',
        sessionId: 'session-1',
        status: 'PENDING',
      };
      prisma.booking.create.mockResolvedValue(createdBooking);

      const result = await service.bookSeats(bookingDto, 'user-1');

      expect(prisma.session.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-1' },
      });
      expect(prisma.seat.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['seat-1', 'seat-2'] }, hallId: 'hall-1' },
      });
      expect(prisma.ticket.findFirst).toHaveBeenCalledWith({
        where: { sessionId: 'session-1', seatId: { in: ['seat-1', 'seat-2'] } },
      });
      expect(prisma.bookingSeat.findFirst).toHaveBeenCalled();
      expect(prisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessionId: 'session-1',
            userId: 'user-1',
            status: 'PENDING',
          }),
        }),
      );
      expect(result).toEqual(createdBooking);
    });

    it('повинен викинути NotFoundException, якщо сеанс не знайдено', async () => {
      prisma.session.findUnique.mockResolvedValue(null);

      await expect(service.bookSeats(bookingDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.seat.findMany).not.toHaveBeenCalled();
    });

    it('повинен викинути BadRequestException, якщо деякі місця не з цього залу', async () => {
      prisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        hallId: 'hall-1',
      });
      // Повертаємо тільки одне місце замість двох
      prisma.seat.findMany.mockResolvedValue([
        { id: 'seat-1', hallId: 'hall-1' },
      ]);

      await expect(service.bookSeats(bookingDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.ticket.findFirst).not.toHaveBeenCalled();
    });

    it('повинен викинути BadRequestException, якщо одне з місць вже викуплено', async () => {
      prisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        hallId: 'hall-1',
      });
      prisma.seat.findMany.mockResolvedValue([
        { id: 'seat-1', hallId: 'hall-1' },
        { id: 'seat-2', hallId: 'hall-1' },
      ]);
      prisma.ticket.findFirst.mockResolvedValue({ id: 'ticket-1' });

      await expect(service.bookSeats(bookingDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.booking.create).not.toHaveBeenCalled();
    });

    it('повинен викинути BadRequestException, якщо одне з місць вже тимчасово заброньоване', async () => {
      prisma.session.findUnique.mockResolvedValue({
        id: 'session-1',
        hallId: 'hall-1',
      });
      prisma.seat.findMany.mockResolvedValue([
        { id: 'seat-1', hallId: 'hall-1' },
        { id: 'seat-2', hallId: 'hall-1' },
      ]);
      prisma.ticket.findFirst.mockResolvedValue(null);
      prisma.bookingSeat.findFirst.mockResolvedValue({ id: 'bs-1' });

      await expect(service.bookSeats(bookingDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.booking.create).not.toHaveBeenCalled();
    });
  });

  describe('confirmBooking', () => {
    const validBooking = {
      id: 'booking-1',
      sessionId: 'session-1',
      userId: 'user-1',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // ще дійсне
      session: { id: 'session-1', price: 100 },
      seats: [
        { seat: { id: 'seat-1', type: 'STANDARD' } },
        { seat: { id: 'seat-2', type: 'VIP' } }, // 100 * 1.5 = 150
      ],
    };

    it('повинен успішно підтвердити бронювання, створити Order та випустити Ticket', async () => {
      prisma.booking.findUnique.mockResolvedValue(validBooking);

      const txMock = {
        order: {
          create: vi
            .fn()
            .mockResolvedValue({
              id: 'order-1',
              totalAmount: 250,
              status: 'PAID',
            }),
        },
        ticket: {
          create: vi
            .fn()
            .mockImplementation(({ data }) =>
              Promise.resolve({ id: `ticket-${data.seatId}`, ...data }),
            ),
        },
        booking: {
          update: vi
            .fn()
            .mockResolvedValue({ id: 'booking-1', status: 'CONFIRMED' }),
        },
      };

      prisma.$transaction.mockImplementation((cb: (tx: any) => any) =>
        cb(txMock),
      );

      const result = await service.confirmBooking(
        'booking-1',
        { customerName: 'Marta' },
        'user-1',
      );

      expect(txMock.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          bookingId: 'booking-1',
          totalAmount: 250, // 100 + 150
          status: 'PAID',
          customerName: 'Marta',
        }),
      });
      expect(txMock.ticket.create).toHaveBeenCalledTimes(2);
      expect(txMock.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-1' },
        data: { status: 'CONFIRMED' },
      });
      expect(result.order).toBeDefined();
      expect(result.tickets).toHaveLength(2);
    });

    it('повинен викинути NotFoundException, якщо бронювання не знайдено', async () => {
      prisma.booking.findUnique.mockResolvedValue(null);

      await expect(service.confirmBooking('fake-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('повинен викинути BadRequestException, якщо статус бронювання не PENDING', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        ...validBooking,
        status: 'CONFIRMED',
      });

      await expect(service.confirmBooking('booking-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('повинен викинути BadRequestException і оновити статус на EXPIRED, якщо час бронювання минув', async () => {
      const expiredBooking = {
        ...validBooking,
        expiresAt: new Date(Date.now() - 5000), // минулий час
      };
      prisma.booking.findUnique.mockResolvedValue(expiredBooking);
      prisma.booking.update.mockResolvedValue({
        ...expiredBooking,
        status: 'EXPIRED',
      });

      await expect(service.confirmBooking('booking-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-1' },
        data: { status: 'EXPIRED' },
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('getMyTickets', () => {
    it('повинен повернути квитки користувача', async () => {
      const mockTickets = [
        { id: 't1', qrCode: 'qr-1' },
        { id: 't2', qrCode: 'qr-2' },
      ];
      prisma.ticket.findMany.mockResolvedValue(mockTickets);

      const result = await service.getMyTickets('user-1');

      expect(prisma.ticket.findMany).toHaveBeenCalledWith({
        where: { order: { userId: 'user-1' } },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].qrCodeImage).toContain('data:image/png;base64,');
    });
  });

  describe('verifyTicket', () => {
    it('повинен повернути квиток, якщо QR-код валідний', async () => {
      const mockTicket = { id: 't1', qrCode: 'valid-qr' };
      prisma.ticket.findUnique.mockResolvedValue(mockTicket);

      const result = await service.verifyTicket('valid-qr');

      expect(prisma.ticket.findUnique).toHaveBeenCalledWith({
        where: { qrCode: 'valid-qr' },
        include: expect.any(Object),
      });
      expect(result.id).toBe('t1');
      expect(result.qrCodeImage).toContain('data:image/png;base64,');
    });

    it('повинен викинути NotFoundException, якщо квиток за QR-кодом не знайдено', async () => {
      prisma.ticket.findUnique.mockResolvedValue(null);

      await expect(service.verifyTicket('fake-qr')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTicketQrCodeBuffer', () => {
    it('повинен повернути буфер зображення QR-коду', async () => {
      prisma.ticket.findUnique.mockResolvedValue({ id: 't1', qrCode: 'test-qr' });

      const buffer = await service.getTicketQrCodeBuffer('t1');
      expect(Buffer.isBuffer(buffer)).toBe(true);
    });

    it('повинен викинути NotFoundException якщо квиток не знайдено', async () => {
      prisma.ticket.findUnique.mockResolvedValue(null);

      await expect(service.getTicketQrCodeBuffer('fake')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});


