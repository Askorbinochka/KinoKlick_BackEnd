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
import { ApiProduces, ApiTags } from '@nestjs/swagger';
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

  @Get(':id/qr-code')
  @ApiProduces('image/png')
  async getTicketQrCode(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.ticketsService.getTicketQrCodeBuffer(id);
    res.setHeader('Content-Type', 'image/png');
    res.end(buffer);
  }

  @Get('verify/:qrCode')
  verifyTicket(@Param('qrCode') qrCode: string) {
    return this.ticketsService.verifyTicket(qrCode);
  }
}
