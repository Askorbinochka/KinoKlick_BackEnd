import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class CreateMovieDto {
  @ApiProperty({
    example: 'Дюна: Частина друга',
    description: 'Назва фільму',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    example: 'Пол Атрід об’єднується з Чані та фременами, щоб помститися...',
    description: 'Короткий опис / синопсис',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example:
      'https://image.tmdb.org/t/p/original/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg',
    description: 'Пряме посилання на постер фільму',
  })
  @IsOptional()
  @IsString()
  posterUrl?: string;

  @ApiProperty({
    example: ['Фантастика', 'Пригоди', 'Драма'],
    description: 'Список жанрів',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  genres: string[];

  @ApiProperty({
    example: 166,
    description: 'Тривалість фільму у хвилинах',
  })
  @IsInt()
  @IsPositive()
  duration: number;

  @ApiPropertyOptional({
    example: 8.6,
    description: 'Рейтинг фільму (від 0 до 10)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rating?: number;

  @ApiPropertyOptional({
    example: 'https://www.youtube.com/watch?v=Way9Dexny3w',
    description: 'Посилання на YouTube трейлер',
  })
  @IsOptional()
  @IsString()
  trailerUrl?: string;

  @ApiPropertyOptional({
    example: 'Дені Вільнев',
    description: 'Режисер фільму',
  })
  @IsOptional()
  @IsString()
  director?: string;

  @ApiPropertyOptional({
    example: 'Український дубляж',
    description: 'Мова показу / дубляжу',
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    example: 16,
    description: 'Вікове обмеження (років)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  ageRestriction?: number;
}
