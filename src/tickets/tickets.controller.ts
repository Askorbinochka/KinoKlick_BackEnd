import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ConfirmBookingDto } from './dto/confirm-booking.dto.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { TicketsService } from './tickets.service.js';

@ApiTags('tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post('book')
  @ApiOperation({
    summary: 'Крок 1: Тимчасово забронювати місця на 15 хвилин',
    description:
      'Резервує обрані місця на 15 хвилин зі статусом PENDING. Якщо за 15 хвилин оплата не підтвердиться — бронь автоматично скасовується. Захищає від одночасного вибору одного місця.',
  })
  @ApiResponse({
    status: 201,
    description: 'Місця успішно заброньовано',
    schema: {
      example: {
        id: 'booking-uuid',
        sessionId: 'session-uuid',
        status: 'PENDING',
        expiresAt: '2026-11-05T12:15:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Місця вже викуплені або заброньовані іншим глядачем',
  })
  @ApiResponse({
    status: 404,
    description: 'Сеанс не знайдено',
  })
  bookSeats(@Body() dto: CreateBookingDto, @Req() req: any) {
    return this.ticketsService.bookSeats(dto, req.user?.id);
  }

  @Post('confirm/:bookingId')
  @ApiOperation({
    summary: 'Крок 2: Оплата та підтвердження замовлення',
    description:
      'Підтверджує замовлення, створює запис Order зі статусом PAID та генерує квитки Ticket з унікальними QR-кодами у транзакції БД',
  })
  @ApiParam({
    name: 'bookingId',
    description: 'UUID активного бронювання (отриманий на Кроці 1)',
  })
  @ApiResponse({
    status: 201,
    description: 'Замовлення оплачено, квитки випущено',
    schema: {
      example: {
        order: {
          id: 'order-uuid',
          totalAmount: 400,
          status: 'PAID',
          customerName: 'Олександр Шевченко',
        },
        tickets: [
          {
            id: 'ticket-uuid',
            price: 200,
            qrCode: '8dcf5eee-c1c9-4348-bc7f-b49ca2bb0d2b',
            qrCodeImage: 'data:image/png;base64,iVBORw0KGgoAAA...',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Час дії броні минув або статус некоректний',
  })
  @ApiResponse({
    status: 404,
    description: 'Бронювання не знайдено',
  })
  confirmBooking(
    @Param('bookingId') bookingId: string,
    @Body() dto: ConfirmBookingDto,
    @Req() req: any,
  ) {
    return this.ticketsService.confirmBooking(bookingId, dto, req.user?.id);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Мої квитки (Особистий кабінет)',
    description:
      'Повертає всі придбані квитки залогіненого користувача з повною інформацією про сеанс, зал та QR-код',
  })
  @ApiResponse({
    status: 200,
    description: 'Список квитків користувача',
  })
  @ApiResponse({
    status: 401,
    description: 'Необхідна авторизація',
  })
  getMyTickets(@Req() req: any) {
    return this.ticketsService.getMyTickets(req.user.id);
  }

  @Get(':id/qr-code')
  @ApiProduces('image/png')
  @ApiOperation({
    summary: 'Завантажити графічне зображення QR-коду квитка',
    description:
      'Повертає файл зображення (PNG) з QR-кодом квитка для відображення в <img> або сканування телефоном',
  })
  @ApiParam({ name: 'id', description: 'UUID квитка' })
  @ApiResponse({
    status: 200,
    description: 'Зображення PNG з QR-кодом',
  })
  @ApiResponse({
    status: 404,
    description: 'Квиток не знайдено',
  })
  async getTicketQrCode(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.ticketsService.getTicketQrCodeBuffer(id);
    res.setHeader('Content-Type', 'image/png');
    res.end(buffer);
  }

  @Get('verify/:qrCode')
  @ApiOperation({
    summary: 'Перевірка квитка за QR-кодом (для контролера)',
    description:
      'Валідує квиток на вході до кінозалу за просканованим кодом та повертає інформацію про глядача та сеанс',
  })
  @ApiParam({
    name: 'qrCode',
    description: 'Текстовий код із QR-коду (UUID)',
    example: '8dcf5eee-c1c9-4348-bc7f-b49ca2bb0d2b',
  })
  @ApiResponse({
    status: 200,
    description: 'Квиток валідний, інформація про сеанс і місце',
  })
  @ApiResponse({
    status: 404,
    description: 'Квиток не знайдено або недійсний',
  })
  verifyTicket(@Param('qrCode') qrCode: string) {
    return this.ticketsService.verifyTicket(qrCode);
  }
}
