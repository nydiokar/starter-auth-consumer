import { Global, Module, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { AUTH_PRISMA } from '@lean-kit/auth';

@Global()
@Module({
  providers: [
    PrismaService, 
    {
      provide: AUTH_PRISMA,
      useExisting: PrismaService,
    },
    {
      provide: 'AUTH_PRISMA_DEBUG',
      useFactory: (prismaService: PrismaService) => {
        const logger = new Logger('AUTH_PRISMA_DEBUG');
        logger.log('AUTH_PRISMA token is being provided with PrismaService instance');
        logger.log(`PrismaService instance: ${!!prismaService ? 'EXISTS' : 'NULL'}`);
        return prismaService;
      },
      inject: [PrismaService],
    }
  ],
  exports: [PrismaService, AUTH_PRISMA],
})
export class PrismaModule {}

