import 'reflect-metadata';
import { Module, Global } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthModule, CsrfModule, AUTH_MAILER } from '@lean-kit/auth';
import { PrismaService } from './prisma.service.js';
import { PrismaModule } from './prisma.module.js';
import { env } from './env.js';
import { AdminController } from './controllers/admin.controller.js';
import { DevController } from './dev/dev.controller.js';
import { addToken } from './dev/dev-store.js';

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
        mailerProvider: { provide: AUTH_MAILER, useValue: {
          async sendVerifyEmail(user: { email: string }, token: string) {
            addToken({ type: 'verify', email: user.email, token, at: new Date().toISOString() });
          },
          async sendPasswordReset(user: { email: string }, token: string) {
            addToken({ type: 'reset', email: user.email, token, at: new Date().toISOString() });
          }
        } },
      } : {}),
    }),
  ],
  providers: [],
  controllers: [AdminController, DevController],
  exports: [],
})
export class AppModule {}
