import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'alex@example.com',
    description: 'Електронна пошта користувача',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'Надійний пароль (мінімум 6 символів)',
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    example: 'Олександр',
    description: "Ім'я користувача",
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Шевченко',
    description: 'Прізвище користувача',
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    example: '+380501234567',
    description: 'Контактний номер телефону',
  })
  @IsString()
  @IsOptional()
  phone?: string;
}
