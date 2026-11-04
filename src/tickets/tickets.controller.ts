import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ConfirmBookingDto } from './dto/confirm-booking.dto.js';
import { CreateBookingDto } from './dto/create-booking.dto.js';
import { TicketsService } from './tickets.service.js';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post('book')
  bookSeats(@Body() dto: CreateBookingDto, @Req() req: any) {
    return this.ticketsService.bookSeats(dto, req.user?.id);
  }

  @Post('confirm/:bookingId')
  confirmBooking(
    @Param('bookingId') bookingId: string,
    @Body() dto: ConfirmBookingDto,
    @Req() req: any,
  ) {
    return this.ticketsService.confirmBooking(bookingId, dto, req.user?.id);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMyTickets(@Req() req: any) {
    return this.ticketsService.getMyTickets(req.user.id);
  }

  @Get('verify/:qrCode')
  verifyTicket(@Param('qrCode') qrCode: string) {
    return this.ticketsService.verifyTicket(qrCode);
  }
}
