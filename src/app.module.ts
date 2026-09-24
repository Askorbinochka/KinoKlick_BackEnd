import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { MoviesModule } from './movies/movies.module.js';
import { SessionsModule } from './sessions/sessions.module.js';
import { TicketsModule } from './tickets/tickets.module.js';

@Module({
  imports: [PrismaModule, AuthModule, MoviesModule, SessionsModule, TicketsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
