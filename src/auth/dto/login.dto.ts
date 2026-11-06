import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'user@cinoclick.com',
    description: 'Електронна пошта користувача',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'Пароль облікового запису (мін. 6 символів)',
  })
  @IsString()
  @MinLength(6)
  password: string;
}
