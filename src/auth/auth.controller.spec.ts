import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            RegisterUser: vi.fn(),
            LoginUser: vi.fn(),
            getMe: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should register a user', async () => {
    const dto = { email: 'test@example.com', password: 'password123' };
    vi.spyOn(authService, 'RegisterUser').mockResolvedValue({
      access_token: 'token123',
    });

    const result = await controller.registerUser(dto);
    expect(result).toEqual({ access_token: 'token123' });
    expect(authService.RegisterUser).toHaveBeenCalledWith(dto);
  });

  it('should login a user', async () => {
    const dto = { email: 'test@example.com', password: 'password123' };
    vi.spyOn(authService, 'LoginUser').mockResolvedValue({
      access_token: 'token123',
    });

    const result = await controller.loginUser(dto);
    expect(result).toEqual({ access_token: 'token123' });
    expect(authService.LoginUser).toHaveBeenCalledWith(dto);
  });

  it('should return current user profile', async () => {
    const userProfile = {
      id: 'user-1',
      email: 'test@example.com',
      role: 'USER',
    };
    vi.spyOn(authService, 'getMe').mockResolvedValue(userProfile as any);

    const req = { user: { id: 'user-1' } };
    const result = await controller.me(req);
    expect(result).toEqual(userProfile);
    expect(authService.getMe).toHaveBeenCalledWith('user-1');
  });
});
