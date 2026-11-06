import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { CreateSessionDto } from './dto/create-session.dto.js';
import { QuerySessionDto } from './dto/query-session.dto.js';
import { UpdateSessionDto } from './dto/update-session.dto.js';
import { SessionsService } from './sessions.service.js';

@ApiTags('Sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Створити новий сеанс (Адмін / Модератор)',
    description: 'Додає новий сеанс у розклад показів кінотеатру',
  })
  @ApiResponse({ status: 201, description: 'Сеанс успішно створено' })
  @ApiResponse({ status: 404, description: 'Фільм або зал не знайдено' })
  create(@Body() dto: CreateSessionDto) {
    return this.sessionsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Отримати розклад сеансів',
    description:
      'Повертає список сеансів із можливістю фільтрації за датою, фільмом, залом або кінотеатром',
  })
  @ApiResponse({ status: 200, description: 'Список сеансів' })
  findAll(@Query() query: QuerySessionDto) {
    return this.sessionsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Отримати інформацію про сеанс',
    description:
      'Повертає час сеансу, базову ціну, а також дані про фільм, зал і кінотеатр',
  })
  @ApiParam({ name: 'id', description: 'UUID сеансу' })
  @ApiResponse({ status: 200, description: 'Деталі сеансу' })
  @ApiResponse({ status: 404, description: 'Сеанс не знайдено' })
  findOne(@Param('id') id: string) {
    return this.sessionsService.findOne(id);
  }

  @Get(':id/seats')
  @ApiOperation({
    summary: 'Отримати інтерактивну карту залу із зайнятістю місць (Карта залу)',
    description:
      'Повертає матрицю рядів та місць із динамічним статусом (AVAILABLE, BOOKED, SOLD) та розрахованою ціною (з урахуванням націнки на VIP-місця)',
  })
  @ApiParam({ name: 'id', description: 'UUID сеансу' })
  @ApiResponse({
    status: 200,
    description: 'Карта залу з місцями та статусами',
    schema: {
      example: {
        session: {
          id: 's-1',
          startTime: '2026-11-05T18:00:00.000Z',
          basePrice: 200,
          movie: { title: 'Дюна: Частина друга' },
          hall: { name: 'Зал 1 — IMAX Laser' },
        },
        seats: [
          {
            id: 'seat-1',
            row: 1,
            number: 1,
            type: 'STANDARD',
            status: 'AVAILABLE',
            price: 200,
          },
          {
            id: 'seat-2',
            row: 4,
            number: 4,
            type: 'STANDARD',
            status: 'BOOKED',
            price: 200,
          },
          {
            id: 'seat-3',
            row: 3,
            number: 4,
            type: 'STANDARD',
            status: 'SOLD',
            price: 200,
          },
          {
            id: 'seat-4',
            row: 5,
            number: 1,
            type: 'VIP',
            status: 'AVAILABLE',
            price: 300,
          },
        ],
      },
    },
  })
  getSeats(@Param('id') id: string) {
    return this.sessionsService.getSeats(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Оновити сеанс (Адмін / Модератор)',
    description: 'Зміна часу, ціни, фільму чи залу для існуючого сеансу',
  })
  @ApiParam({ name: 'id', description: 'UUID сеансу' })
  @ApiResponse({ status: 200, description: 'Сеанс успішно оновлено' })
  update(@Param('id') id: string, @Body() dto: UpdateSessionDto) {
    return this.sessionsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Видалити сеанс (Тільки Адмін)',
    description: 'Видаляє сеанс із розкладу',
  })
  @ApiParam({ name: 'id', description: 'UUID сеансу' })
  @ApiResponse({ status: 200, description: 'Сеанс видалено' })
  remove(@Param('id') id: string) {
    return this.sessionsService.remove(id);
  }
}
