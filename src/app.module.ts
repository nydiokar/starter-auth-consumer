import 'reflect-metadata';
import { Module, Global } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthModule, CsrfModule, AUTH_MAILER } from '@lean-kit/auth';
import { PrismaService } from './prisma.service.js';
import { PrismaModule } from './prisma.module.js';
import { env } from './env.js';
import { AdminController } from './controllers/admin.controller.js';
import { DevMailerService } from './dev/dev-mailer.service.js';
import { DevTokenStore } from './dev/dev-token.store.js';
import { DevController } from './dev/dev.controller.js';

@Global()
@Module({
  imports: [
    PrismaModule,
    CsrfModule,
    AuthModule.forRoot({
      redis: { url: env.redisUrl },
      prisma: {},
      cookie: env.cookie,
      csrfCookieName: env.csrfCookieName,
      pepper: env.pepper,
      mailer: env.mailer,
      // Override mailer in dev to capture tokens
      ...(process.env.NODE_ENV === 'development' ? {
        mailerProvider: { provide: AUTH_MAILER, useClass: DevMailerService }, // <- useClass, not useExisting
      } : {}),
    }),
  ],
  providers: [
    DevTokenStore,    // <- Add this dependency
    DevMailerService, // <- Add this provider
  ],
  controllers: [AdminController, DevController],
  exports: [],
})
export class AppModule {}
