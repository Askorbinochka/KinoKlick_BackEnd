import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmBookingDto } from './dto/confirm-booking.dto.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { TicketsController } from './tickets.controller.js';
import { TicketsService } from './tickets.service.js';

describe('TicketsController', () => {
  let controller: TicketsController;
  let service: {
    bookSeats: ReturnType<typeof vi.fn>;
    confirmBooking: ReturnType<typeof vi.fn>;
    getMyTickets: ReturnType<typeof vi.fn>;
    verifyTicket: ReturnType<typeof vi.fn>;
    getTicketQrCodeBuffer: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    service = {
      bookSeats: vi.fn(),
      confirmBooking: vi.fn(),
      getMyTickets: vi.fn(),
      verifyTicket: vi.fn(),
      getTicketQrCodeBuffer: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [
        {
          provide: TicketsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<TicketsController>(TicketsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('bookSeats повинен викликати ticketsService.bookSeats', async () => {
    const dto: CreateBookingDto = { sessionId: 's1', seatIds: ['seat-1'] };
    const mockBooking = { id: 'b1' };
    service.bookSeats.mockResolvedValue(mockBooking);

    const result = await controller.bookSeats(dto, { user: { id: 'u1' } });

    expect(service.bookSeats).toHaveBeenCalledWith(dto, 'u1');
    expect(result).toEqual(mockBooking);
  });

  it('confirmBooking повинен викликати ticketsService.confirmBooking', async () => {
    const dto: ConfirmBookingDto = { customerName: 'Test' };
    const mockOrder = { order: { id: 'o1' } };
    service.confirmBooking.mockResolvedValue(mockOrder);

    const result = await controller.confirmBooking('b1', dto, { user: { id: 'u1' } });

    expect(service.confirmBooking).toHaveBeenCalledWith('b1', dto, 'u1');
    expect(result).toEqual(mockOrder);
  });

  it('getMyTickets повинен викликати ticketsService.getMyTickets', async () => {
    const mockTickets = [{ id: 't1' }];
    service.getMyTickets.mockResolvedValue(mockTickets);

    const result = await controller.getMyTickets({ user: { id: 'u1' } });

    expect(service.getMyTickets).toHaveBeenCalledWith('u1');
    expect(result).toEqual(mockTickets);
  });

  it('verifyTicket повинен викликати ticketsService.verifyTicket', async () => {
    const mockTicket = { id: 't1', qrCode: 'qr-123' };
    service.verifyTicket.mockResolvedValue(mockTicket);

    const result = await controller.verifyTicket('qr-123');

    expect(service.verifyTicket).toHaveBeenCalledWith('qr-123');
    expect(result).toEqual(mockTicket);
  });

  it('getTicketQrCode повинен віддавати PNG буфер у відповідь', async () => {
    const fakeBuffer = Buffer.from('fake-png');
    service.getTicketQrCodeBuffer.mockResolvedValue(fakeBuffer);

    const mockRes = {
      setHeader: vi.fn(),
      end: vi.fn(),
    } as any;

    await controller.getTicketQrCode('t1', mockRes);

    expect(service.getTicketQrCodeBuffer).toHaveBeenCalledWith('t1');
    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
    expect(mockRes.end).toHaveBeenCalledWith(fakeBuffer);
  });
});

