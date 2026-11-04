import { IsEmail, IsOptional, IsString } from 'class-validator';

export class ConfirmBookingDto {
  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Некоректний формат email' })
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;
}
