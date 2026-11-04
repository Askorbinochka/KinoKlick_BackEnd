import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

vi.mock('bcrypt', () => {
  return {
    default: {
      hash: vi.fn().mockResolvedValue('hashed_password'),
      compare: vi.fn(),
    },
    hash: vi.fn().mockResolvedValue('hashed_password'),
    compare: vi.fn(),
  };
});

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwt: JwtService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: vi.fn(),
              create: vi.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: vi.fn().mockResolvedValue('test_token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('RegisterUser', () => {
    it('should throw ConflictException if email already exists', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: '1' } as any);

      await expect(
        service.RegisterUser({
          email: 'existing@mail.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should register a new user and return access_token', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      vi.spyOn(prisma.user, 'create').mockResolvedValue({
        id: 'user-1',
        email: 'new@mail.com',
        role: Role.USER,
      } as any);

      const result = await service.RegisterUser({
        email: 'new@mail.com',
        password: 'password123',
      });

      expect(result).toEqual({ access_token: 'test_token' });
      expect(jwt.signAsync).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'new@mail.com',
        role: Role.USER,
      });
    });
  });

  describe('LoginUser', () => {
    it('should throw NotFoundException if user is not found', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      await expect(
        service.LoginUser({
          email: 'notfound@mail.com',
          password: 'password123',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: '1',
        email: 'test@mail.com',
        password: 'hashed_password',
      } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        service.LoginUser({
          email: 'test@mail.com',
          password: 'wrong_password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return access_token on successful login', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'user-1',
        email: 'test@mail.com',
        password: 'hashed_password',
        role: Role.ADMIN,
      } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const result = await service.LoginUser({
        email: 'test@mail.com',
        password: 'correct_password',
      });

      expect(result).toEqual({ access_token: 'test_token' });
      expect(jwt.signAsync).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'test@mail.com',
        role: Role.ADMIN,
      });
    });
  });

  describe('getMe', () => {
    it('should throw NotFoundException if user not found', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      await expect(service.getMe('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return user profile without password', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@mail.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+380501234567',
        role: Role.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any);

      const result = await service.getMe('user-1');
      expect(result).toEqual(mockUser);
    });
  });
});
