import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { CreateMovieDto } from './dto/create-movie.dto.js';
import { UpdateMovieDto } from './dto/update-movie.dto.js';
import { MoviesService } from './movies.service.js';

@ApiTags('movies')
@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Створити новий фільм (Адмін / Модератор)',
    description: 'Додає новий фільм у базу даних',
  })
  @ApiResponse({
    status: 201,
    description: 'Фільм успішно створено',
  })
  @ApiResponse({
    status: 403,
    description: 'Недостатньо прав (потрібна роль ADMIN або MODERATOR)',
  })
  create(@Body() dto: CreateMovieDto) {
    return this.moviesService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Отримати список усіх фільмів',
    description:
      'Повертає каталог фільмів з можливістю пошуку за ключовим словом та фільтрації за жанром',
  })
  @ApiQuery({
    name: 'genre',
    required: false,
    example: 'Фантастика',
    description: 'Фільтрація за жанром',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    example: 'Дюна',
    description: 'Пошук за словом у назві або описі',
  })
  @ApiResponse({
    status: 200,
    description: 'Список фільмів',
  })
  findAll(@Query('genre') genre?: string, @Query('search') search?: string) {
    return this.moviesService.findAll({ genre, search });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Отримати детальну інформацію про фільм',
    description:
      'Повертає деталі фільму разом зі списком запланованих сеансів у кінотеатрах',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID ідентифікатор фільму',
    example: 'd44b6293-214d-4181-8b5c-d9b69359d268',
  })
  @ApiResponse({
    status: 200,
    description: 'Інформація про фільм та його сеанси',
  })
  @ApiResponse({
    status: 404,
    description: 'Фільм не знайдено',
  })
  findOne(@Param('id') id: string) {
    return this.moviesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Оновити дані про фільм (Адмін / Модератор)',
    description: 'Оновлює окремі поля фільму',
  })
  @ApiParam({ name: 'id', description: 'UUID фільму' })
  @ApiResponse({ status: 200, description: 'Фільм успішно оновлено' })
  update(@Param('id') id: string, @Body() dto: UpdateMovieDto) {
    return this.moviesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Видалити фільм (Тільки Адмін)',
    description: 'Повністю видаляє фільм із бази даних',
  })
  @ApiParam({ name: 'id', description: 'UUID фільму' })
  @ApiResponse({ status: 200, description: 'Фільм успішно видалено' })
  remove(@Param('id') id: string) {
    return this.moviesService.remove(id);
  }
}
