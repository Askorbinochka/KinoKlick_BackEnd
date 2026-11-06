import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsUUID, Min } from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({
    example: '2026-11-10T18:30:00.000Z',
    description: 'Дата та час початку сеансу (ISO рядок)',
  })
  @IsDateString()
  startTime: string;

  @ApiProperty({
    example: 'd44b6293-214d-4181-8b5c-d9b69359d268',
    description: 'UUID ідентифікатор фільму',
  })
  @IsUUID()
  movieId: string;

  @ApiProperty({
    example: 'a12b34c5-5678-4181-8b5c-d9b69359d999',
    description: 'UUID ідентифікатор залу',
  })
  @IsUUID()
  hallId: string;

  @ApiProperty({
    example: 200,
    description: 'Базова ціна за квиток (грн)',
  })
  @IsNumber()
  @Min(0)
  price: number;
}
