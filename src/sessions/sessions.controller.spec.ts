import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateSessionDto } from './dto/create-session.dto.js';
import { QuerySessionDto } from './dto/query-session.dto.js';
import { UpdateSessionDto } from './dto/update-session.dto.js';
import { SessionsController } from './sessions.controller.js';
import { SessionsService } from './sessions.service.js';

describe('SessionsController', () => {
  let controller: SessionsController;
  let service: {
    create: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    getSeats: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    service = {
      create: vi.fn(),
      findAll: vi.fn(),
      findOne: vi.fn(),
      getSeats: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionsController],
      providers: [
        {
          provide: SessionsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<SessionsController>(SessionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create повинен делегувати виклик до sessionsService.create', async () => {
    const dto: CreateSessionDto = {
      movieId: 'movie-1',
      hallId: 'hall-1',
      startTime: '2026-11-01T18:00:00.000Z',
      price: 150,
    };
    service.create.mockResolvedValue({ id: 's1', ...dto });

    const result = await controller.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 's1', ...dto });
  });

  it('findAll повинен делегувати виклик до sessionsService.findAll', async () => {
    const query: QuerySessionDto = { movieId: 'movie-1' };
    const mockList = [{ id: 's1' }];
    service.findAll.mockResolvedValue(mockList);

    const result = await controller.findAll(query);

    expect(service.findAll).toHaveBeenCalledWith(query);
    expect(result).toEqual(mockList);
  });

  it('findOne повинен делегувати виклик до sessionsService.findOne', async () => {
    const mockSession = { id: 's1' };
    service.findOne.mockResolvedValue(mockSession);

    const result = await controller.findOne('s1');

    expect(service.findOne).toHaveBeenCalledWith('s1');
    expect(result).toEqual(mockSession);
  });

  it('getSeats повинен делегувати виклик до sessionsService.getSeats', async () => {
    const mockSeats = { session: { id: 's1' }, seats: [] };
    service.getSeats.mockResolvedValue(mockSeats);

    const result = await controller.getSeats('s1');

    expect(service.getSeats).toHaveBeenCalledWith('s1');
    expect(result).toEqual(mockSeats);
  });

  it('update повинен делегувати виклик до sessionsService.update', async () => {
    const dto: UpdateSessionDto = { price: 200 };
    const mockUpdated = { id: 's1', price: 200 };
    service.update.mockResolvedValue(mockUpdated);

    const result = await controller.update('s1', dto);

    expect(service.update).toHaveBeenCalledWith('s1', dto);
    expect(result).toEqual(mockUpdated);
  });

  it('remove повинен делегувати виклик до sessionsService.remove', async () => {
    const mockResponse = { message: 'Сеанс видалено' };
    service.remove.mockResolvedValue(mockResponse);

    const result = await controller.remove('s1');

    expect(service.remove).toHaveBeenCalledWith('s1');
    expect(result).toEqual(mockResponse);
  });
});

