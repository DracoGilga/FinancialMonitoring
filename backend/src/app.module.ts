// src/app.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from './4_frameworks_and_drivers/modules/AuthModule';

@Module({
  imports: [AuthModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
