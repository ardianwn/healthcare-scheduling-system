import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: 300000, // 5 minutes in milliseconds
      max: 100, // Maximum number of items in cache
    }),
  ],
})
export class RedisCacheModule {}
