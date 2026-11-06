import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Реєстрація нового користувача',
    description:
      'Створює новий обліковий запис у системі та повертає JWT access token',
  })
  @ApiResponse({
    status: 201,
    description: 'Користувача успішно зареєстровано',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Email уже використовується',
  })
  registerUser(@Body() dto: RegisterDto) {
    return this.authService.RegisterUser(dto);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Авторизація користувача (вхід)',
    description: 'Перевіряє email і пароль та повертає JWT access token',
  })
  @ApiResponse({
    status: 200,
    description: 'Успішний вхід',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Невірний пароль',
  })
  @ApiResponse({
    status: 404,
    description: 'Користувача не знайдено',
  })
  loginUser(@Body() dto: LoginDto) {
    return this.authService.LoginUser(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Отримати профіль поточного користувача',
    description:
      'Повертає детальну інформацію про профіль залогіненого користувача з токена',
  })
  @ApiResponse({
    status: 200,
    description: 'Дані профілю',
    schema: {
      example: {
        id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        email: 'user@cinoclick.com',
        firstName: 'Олександр',
        lastName: 'Шевченко',
        phone: '+380501234567',
        role: 'USER',
        createdAt: '2026-11-05T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Неавторизований (відсутній або недійсний JWT токен)',
  })
  me(@Req() req: any) {
    return this.authService.getMe(req.user.id);
  }
}
