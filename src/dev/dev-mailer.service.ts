import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { DevTokenStore } from './dev-token.store.js';
import { AUTH_CONFIG } from '@lean-kit/auth';

@Injectable()
export class DevMailerService {
  private readonly logger = new Logger(DevMailerService.name);
  constructor(
    private readonly store: DevTokenStore,
    @Optional() @Inject(AUTH_CONFIG) private readonly cfg?: any,
  ) {}

  async sendVerifyEmail(user: { email: string }, token: string) {
    const t = { type: 'verify' as const, email: user.email, token, at: new Date().toISOString() };
    this.store.add(t);
    this.logger.log(`Captured verify token for ${user.email}: ${token}`);
  }

  async sendPasswordReset(user: { email: string }, token: string) {
    const t = { type: 'reset' as const, email: user.email, token, at: new Date().toISOString() };
    this.store.add(t);
    this.logger.log(`Captured reset token for ${user.email}: ${token}`);
  }
}

