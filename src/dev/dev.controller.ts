import { BadRequestException, Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { addToken, listTokens, clearTokens } from './dev-store.js';
import { PrismaService } from '../prisma.service.js';
import { Inject } from '@nestjs/common';
import { AUTH_CONFIG, AUTH_REDIS, SessionService } from '@lean-kit/auth';
import type Redis from 'ioredis';

function ensureDev() {
  if (process.env.NODE_ENV !== 'development') {
    throw new BadRequestException('Dev endpoints disabled (NODE_ENV !== development)');
  }
}

@Controller('dev')
export class DevController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
    @Inject(AUTH_CONFIG) private readonly cfg: any,
    @Inject(AUTH_REDIS) private readonly redis: Redis,
  ) {}

  @Get('tokens')
  listTokens(@Query('email') email?: string) {
    ensureDev();
    return { tokens: listTokens(email) };
  }

  @Post('tokens/clear')
  clearTokens(@Body('email') email?: string) {
    ensureDev();
    clearTokens(email);
    return { ok: true };
  }

  @Post('promote-admin')
  async promoteAdmin(@Body('email') email?: string) {
    ensureDev();
    if (!email) throw new BadRequestException('email required');
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) throw new BadRequestException('user not found');
    const role = await this.prisma.role.upsert({ where: { name: 'admin' }, update: {}, create: { name: 'admin' } });
    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });
    return { ok: true };
  }

  @Get('config')
  getConfig() {
    ensureDev();
    const c = this.cfg || {};
    return {
      cookie: c.cookie,
      csrfCookieName: c.csrfCookieName,
      mailer: { from: c.mailer?.from, frontendUrl: c.mailer?.frontendUrl },
      pepperPreview: c.pepper ? `${String(c.pepper).slice(0, 4)}...(${String(c.pepper).length} chars)` : null,
    };
  }

  @Get('whoami')
  async whoami(@Req() req: any) {
    ensureDev();
    const cookieName = this.cfg?.cookie?.name || 'app.sid';
    const cookieHeader = String(req.headers['cookie'] || '');
    const sessionId = cookieHeader.split(';').map((p: string) => p.trim()).find((p: string) => p.startsWith(cookieName + '='))?.split('=')[1] || null;
    let redisRec: any = null;
    if (sessionId) {
      redisRec = await this.sessions.get(sessionId).catch(() => null);
    }
    return { sessionId, redis: redisRec };
  }

  @Post('session/expire')
  async expireSession(@Req() req: any) {
    ensureDev();
    const cookieName = this.cfg?.cookie?.name || 'app.sid';
    const cookieHeader = String(req.headers['cookie'] || '');
    const sessionId = cookieHeader.split(';').map((p: string) => p.trim()).find((p: string) => p.startsWith(cookieName + '='))?.split('=')[1] || null;
    if (!sessionId) throw new BadRequestException('no session cookie');
    await this.sessions.revoke(sessionId);
    return { ok: true };
  }

  @Post('session/ttl')
  async setSessionTtl(@Req() req: any, @Body('seconds') seconds?: number) {
    ensureDev();
    const secs = Number(seconds || 0);
    if (!Number.isFinite(secs) || secs <= 0) throw new BadRequestException('seconds > 0 required');
    const cookieName = this.cfg?.cookie?.name || 'app.sid';
    const cookieHeader = String(req.headers['cookie'] || '');
    const sessionId = cookieHeader.split(';').map((p: string) => p.trim()).find((p: string) => p.startsWith(cookieName + '='))?.split('=')[1] || null;
    if (!sessionId) throw new BadRequestException('no session cookie');
    await this.redis.expire(`sess:${sessionId}`, secs);
    if (this.prisma?.session) {
      await this.prisma.session.update({ where: { id: sessionId }, data: { expiresAt: new Date(Date.now() + secs * 1000) } }).catch(() => {});
    }
    return { ok: true };
  }

  @Post('ratelimit/clear')
  async ratelimitClear() {
    ensureDev();
    const keys = await new Promise<string[]>((resolve, reject) => {
      const stream = (this.redis as any).scanStream({ match: 'rl:*', count: 100 });
      const out: string[] = [];
      stream.on('data', (ks: string[]) => out.push(...ks));
      stream.on('end', () => resolve(out));
      stream.on('error', reject);
    });
    if (keys.length) await this.redis.del(...keys);
    return { ok: true, deleted: keys.length };
  }

  @Get('audit')
  async audit(@Query('email') email?: string, @Query('limit') limit?: string) {
    ensureDev();
    let userId: string | undefined;
    if (email) {
      const u = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true } });
      userId = u?.id;
    }
    const take = Math.min(Math.max(parseInt(limit || '50', 10) || 50, 1), 200);
    const rows = await this.prisma.auditLog.findMany({
      where: { userId: userId || undefined },
      orderBy: { at: 'desc' },
      take,
    });
    return { rows };
  }

  @Post('audit/clear')
  async auditClear(@Body('email') email?: string) {
    ensureDev();
    if (email) {
      const u = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true } });
      if (!u) return { ok: true, cleared: 0 };
      const r = await this.prisma.auditLog.deleteMany({ where: { userId: u.id } });
      return { ok: true, cleared: r.count };
    }
    const r = await this.prisma.auditLog.deleteMany({});
    return { ok: true, cleared: r.count };
  }
}
