import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      this.logger.warn(
        'REDIS_URL не вказано в .env. Використовується PostgreSQL fallback для блокування місць.',
      );
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.warn(
              'Не вдалося підключитися до Redis. Використовуємо fallback режим.',
            );
            return null;
          }
          return Math.min(times * 100, 2000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('✅ Успішно підключено до Redis!');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Помилка Redis: ${err.message}. Працює fallback.`);
      });
    } catch (error) {
      this.logger.warn(
        `Ініціалізація Redis не вдалася: ${error}. Працює fallback.`,
      );
    }
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
    }
  }

  /**
   * Спроба атомарно заблокувати місця в Redis на вказану кількість секунд (TTL)
   * Повертає true, якщо ВСІ місця вдалося заблокувати; інакше false.
   */
  async lockSeats(
    sessionId: string,
    seatIds: string[],
    userId: string,
    ttlSeconds = 900,
  ): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return true; // Fallback на рівень PostgreSQL
    }

    const acquiredLocks: string[] = [];

    try {
      for (const seatId of seatIds) {
        const lockKey = `lock:session:${sessionId}:seat:${seatId}`;
        // SET key value EX ttl NX — встановити тільки якщо НЕ існує
        const result = await this.client.set(
          lockKey,
          userId,
          'EX',
          ttlSeconds,
          'NX',
        );

        if (result === 'OK') {
          acquiredLocks.push(lockKey);
        } else {
          // Якщо хоча б одне місце вже заблоковане — відкочуємо отримані замки
          if (acquiredLocks.length > 0) {
            await this.client.del(...acquiredLocks);
          }
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logger.warn(`Помилка під час блокування в Redis: ${error}`);
      return true; // Fallback на базу
    }
  }

  /**
   * Звільнення блокування місць у Redis
   */
  async releaseSeats(sessionId: string, seatIds: string[]): Promise<void> {
    if (!this.isConnected || !this.client || seatIds.length === 0) {
      return;
    }

    try {
      const lockKeys = seatIds.map(
        (seatId) => `lock:session:${sessionId}:seat:${seatId}`,
      );
      await this.client.del(...lockKeys);
    } catch (error) {
      this.logger.warn(`Помилка під час зняття блокування в Redis: ${error}`);
    }
  }

  /**
   * Перевірити, чи заблоковане конкретне місце в Redis
   */
  async isSeatLocked(sessionId: string, seatId: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const exists = await this.client.exists(
        `lock:session:${sessionId}:seat:${seatId}`,
      );
      return exists === 1;
    } catch {
      return false;
    }
  }
}
