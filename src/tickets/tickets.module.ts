import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RedisModule } from '../redis/redis.module.js';
import { TicketsController } from './tickets.controller.js';
import { TicketsGateway } from './tickets.gateway.js';
import { TicketsService } from './tickets.service.js';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketsGateway],
  exports: [TicketsService, TicketsGateway],
})
export class TicketsModule {}
