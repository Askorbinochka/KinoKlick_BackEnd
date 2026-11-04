import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { SessionsService } from './sessions.service.js';

describe('SessionsService', () => {
  let service: SessionsService;
  let prisma: {
    session: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    movie: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    hall: {
      findUnique: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      session: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      movie: {
        findUnique: vi.fn(),
      },
      hall: {
        findUnique: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      movieId: 'movie-uuid',
      hallId: 'hall-uuid',
      startTime: '2026-11-01T18:00:00.000Z',
      price: 150,
    };

    it('повинен успішно створити сеанс', async () => {
      prisma.movie.findUnique.mockResolvedValue({ id: 'movie-uuid', title: 'Avatar' });
      prisma.hall.findUnique.mockResolvedValue({ id: 'hall-uuid', name: 'Hall 1' });
      const expectedSession = { id: 'session-uuid', ...createDto, startTime: new Date(createDto.startTime) };
      prisma.session.create.mockResolvedValue(expectedSession);

      const result = await service.create(createDto);

      expect(prisma.movie.findUnique).toHaveBeenCalledWith({ where: { id: createDto.movieId } });
      expect(prisma.hall.findUnique).toHaveBeenCalledWith({ where: { id: createDto.hallId } });
      expect(prisma.session.create).toHaveBeenCalledWith({
        data: {
          startTime: new Date(createDto.startTime),
          movieId: createDto.movieId,
          hallId: createDto.hallId,
          price: createDto.price,
        },
        include: {
          movie: true,
          hall: {
            include: { cinema: true },
          },
        },
      });
      expect(result).toEqual(expectedSession);
    });

    it('повинен викинути NotFoundException, якщо фільм не знайдено', async () => {
      prisma.movie.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      expect(prisma.hall.findUnique).not.toHaveBeenCalled();
      expect(prisma.session.create).not.toHaveBeenCalled();
    });

    it('повинен викинути NotFoundException, якщо зал не знайдено', async () => {
      prisma.movie.findUnique.mockResolvedValue({ id: 'movie-uuid' });
      prisma.hall.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      expect(prisma.session.create).not.toHaveBeenCalled();
    });

    it('повинен викинути BadRequestException, якщо дата startTime некоректна', async () => {
      prisma.movie.findUnique.mockResolvedValue({ id: 'movie-uuid' });
      prisma.hall.findUnique.mockResolvedValue({ id: 'hall-uuid' });

      await expect(
        service.create({ ...createDto, startTime: 'invalid-date' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.session.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('повинен повернути список сеансів без фільтрів', async () => {
      const mockSessions = [{ id: 's1' }, { id: 's2' }];
      prisma.session.findMany.mockResolvedValue(mockSessions);

      const result = await service.findAll();

      expect(prisma.session.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          movie: true,
          hall: { include: { cinema: true } },
        },
        orderBy: { startTime: 'asc' },
      });
      expect(result).toEqual(mockSessions);
    });

    it('повинен застосувати фільтри за movieId, hallId, cinemaId та date', async () => {
      prisma.session.findMany.mockResolvedValue([]);

      await service.findAll({
        movieId: 'movie-1',
        hallId: 'hall-1',
        cinemaId: 'cinema-1',
        date: '2026-11-01',
      });

      expect(prisma.session.findMany).toHaveBeenCalledWith({
        where: {
          movieId: 'movie-1',
          hallId: 'hall-1',
          hall: { cinemaId: 'cinema-1' },
          startTime: {
            gte: new Date('2026-11-01T00:00:00.000Z'),
            lte: new Date('2026-11-01T23:59:59.999Z'),
          },
        },
        include: {
          movie: true,
          hall: { include: { cinema: true } },
        },
        orderBy: { startTime: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('повинен повернути сеанс за id', async () => {
      const mockSession = { id: 'session-1' };
      prisma.session.findUnique.mockResolvedValue(mockSession);

      const result = await service.findOne('session-1');

      expect(prisma.session.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        include: {
          movie: true,
          hall: { include: { cinema: true } },
        },
      });
      expect(result).toEqual(mockSession);
    });

    it('повинен викинути NotFoundException, якщо сеанс не знайдено', async () => {
      prisma.session.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSeats', () => {
    it('повинен коректно призначити статуси місць (AVAILABLE, BOOKED, SOLD) та розрахувати VIP ціни', async () => {
      const mockSession = {
        id: 'session-1',
        startTime: new Date('2026-11-01T18:00:00.000Z'),
        price: 100,
        movie: { id: 'm1', title: 'Movie 1' },
        hall: {
          id: 'h1',
          name: 'Hall 1',
          cinema: { id: 'c1', name: 'Cinema 1' },
          seats: [
            { id: 'seat-1', row: 1, number: 1, type: 'STANDARD' },
            { id: 'seat-2', row: 1, number: 2, type: 'VIP' },
            { id: 'seat-3', row: 1, number: 3, type: 'STANDARD' },
          ],
        },
        tickets: [{ seatId: 'seat-1' }], // seat-1 sold
        bookings: [
          {
            seats: [{ seatId: 'seat-2' }], // seat-2 booked
          },
        ],
      };

      prisma.session.findUnique.mockResolvedValue(mockSession);

      const result = await service.getSeats('session-1');

      expect(result.session.id).toBe('session-1');
      expect(result.session.basePrice).toBe(100);
      expect(result.seats).toHaveLength(3);

      // seat-1: SOLD, standard price 100
      expect(result.seats[0]).toEqual({
        id: 'seat-1',
        row: 1,
        number: 1,
        type: 'STANDARD',
        status: 'SOLD',
        price: 100,
      });

      // seat-2: BOOKED, VIP price 100 * 1.5 = 150
      expect(result.seats[1]).toEqual({
        id: 'seat-2',
        row: 1,
        number: 2,
        type: 'VIP',
        status: 'BOOKED',
        price: 150,
      });

      // seat-3: AVAILABLE, standard price 100
      expect(result.seats[2]).toEqual({
        id: 'seat-3',
        row: 1,
        number: 3,
        type: 'STANDARD',
        status: 'AVAILABLE',
        price: 100,
      });
    });

    it('повинен викинути NotFoundException, якщо сеанс для розкладу місць не знайдено', async () => {
      prisma.session.findUnique.mockResolvedValue(null);

      await expect(service.getSeats('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const existingSession = { id: 'session-1', price: 100 };

    it('повинен оновити поля сеансу', async () => {
      prisma.session.findUnique.mockResolvedValue(existingSession);
      prisma.movie.findUnique.mockResolvedValue({ id: 'movie-2' });
      prisma.hall.findUnique.mockResolvedValue({ id: 'hall-2' });
      prisma.session.update.mockResolvedValue({ id: 'session-1', price: 180 });

      const updateDto = {
        movieId: 'movie-2',
        hallId: 'hall-2',
        startTime: '2026-11-02T20:00:00.000Z',
        price: 180,
      };

      const result = await service.update('session-1', updateDto);

      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: {
          startTime: new Date('2026-11-02T20:00:00.000Z'),
          price: 180,
          movie: { connect: { id: 'movie-2' } },
          hall: { connect: { id: 'hall-2' } },
        },
        include: {
          movie: true,
          hall: { include: { cinema: true } },
        },
      });
      expect(result).toEqual({ id: 'session-1', price: 180 });
    });

    it('повинен викинути NotFoundException, якщо новий фільм не знайдено', async () => {
      prisma.session.findUnique.mockResolvedValue(existingSession);
      prisma.movie.findUnique.mockResolvedValue(null);

      await expect(
        service.update('session-1', { movieId: 'non-existent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('повинен викинути NotFoundException, якщо новий зал не знайдено', async () => {
      prisma.session.findUnique.mockResolvedValue(existingSession);
      prisma.hall.findUnique.mockResolvedValue(null);

      await expect(
        service.update('session-1', { hallId: 'non-existent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('повинен викинути BadRequestException, якщо дата оновлення некоректна', async () => {
      prisma.session.findUnique.mockResolvedValue(existingSession);

      await expect(
        service.update('session-1', { startTime: 'not-a-valid-date' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('повинен видалити сеанс і повернути повідомлення', async () => {
      prisma.session.findUnique.mockResolvedValue({ id: 'session-1' });
      prisma.session.delete.mockResolvedValue({ id: 'session-1' });

      const result = await service.remove('session-1');

      expect(prisma.session.delete).toHaveBeenCalledWith({ where: { id: 'session-1' } });
      expect(result).toEqual({ message: 'Сеанс з id "session-1" успішно видалено' });
    });

    it('повинен викинути NotFoundException, якщо сеанс для видалення не знайдено', async () => {
      prisma.session.findUnique.mockResolvedValue(null);

      await expect(service.remove('session-1')).rejects.toThrow(NotFoundException);
      expect(prisma.session.delete).not.toHaveBeenCalled();
    });
  });
});

