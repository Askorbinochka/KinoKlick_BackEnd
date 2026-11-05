import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class QuerySessionDto {
  @ApiPropertyOptional({ description: 'ID фільму' })
  @IsOptional()
  @IsUUID()
  movieId?: string;

  @ApiPropertyOptional({ description: 'ID кінотеатру' })
  @IsOptional()
  @IsUUID()
  cinemaId?: string;

  @ApiPropertyOptional({ description: 'ID залу' })
  @IsOptional()
  @IsUUID()
  hallId?: string;

  @ApiPropertyOptional({ description: 'Дата сеансу (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date?: string;
}
