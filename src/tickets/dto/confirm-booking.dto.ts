import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class ConfirmBookingDto {
  @ApiPropertyOptional({
    example: 'Олександр Шевченко',
    description: "Ім'я та прізвище покупця квитків",
  })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({
    example: 'alex@example.com',
    description: 'Email для надсилання куплених квитків',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Некоректний формат email' })
  customerEmail?: string;

  @ApiPropertyOptional({
    example: '+380501234567',
    description: 'Контактний телефон покупця',
  })
  @IsOptional()
  @IsString()
  customerPhone?: string;
}
