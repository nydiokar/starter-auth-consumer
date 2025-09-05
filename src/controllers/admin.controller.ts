import { Controller, Get, UseGuards, Logger, Inject } from '@nestjs/common';
import { RequireRole, SessionGuard, RolesGuard } from '@lean-kit/auth';
import { AUTH_PRISMA } from '@lean-kit/auth';

@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    @Inject(AUTH_PRISMA) private readonly prisma: any,
  ) {
    this.logger.log('AdminController initialized');
    this.logger.log(`AUTH_PRISMA injected: ${!!this.prisma ? 'SUCCESS' : 'FAILED'}`);
    this.logger.log(`Prisma type: ${typeof this.prisma}`);
  }

  @Get('ping')
  @UseGuards(SessionGuard, RolesGuard)
  @RequireRole('admin')
  ping() {
    this.logger.log('Ping endpoint called');
    return { ok: true, at: new Date().toISOString() };
  }
}

