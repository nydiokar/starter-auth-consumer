import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { env } from './env.js';
import { PrismaService } from './prisma.service.js';
import { AUTH_PRISMA } from '@lean-kit/auth';
import express from 'express';
import path from 'node:path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    logger.log('Creating NestJS application...');
    const app = await NestFactory.create(AppModule);
    
    logger.log('Setting up global pipes...');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    // Serve static test UI from /public
    const publicDir = path.resolve(process.cwd(), 'public');
    logger.log(`Serving static UI from: ${publicDir}`);
    app.use('/', express.static(publicDir));
    
    logger.log('Getting PrismaService...');
    const prisma = app.get(PrismaService);
    logger.log(`PrismaService: ${!!prisma ? 'FOUND' : 'NOT FOUND'}`);
    
    logger.log('Checking AUTH_PRISMA token...');
    try {
      const authPrisma = app.get(AUTH_PRISMA);
      logger.log(`AUTH_PRISMA: ${!!authPrisma ? 'FOUND' : 'NOT FOUND'}`);
      logger.log(`AUTH_PRISMA type: ${typeof authPrisma}`);
    } catch (error) {
      logger.error(`AUTH_PRISMA injection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    await prisma.enableShutdownHooks(app);
    await app.listen(env.port);
    logger.log(`Auth consumer listening at http://localhost:${env.port}`);
  } catch (error) {
    logger.error(`Bootstrap failed: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error) {
      logger.error(error.stack);
    }
    process.exit(1);
  }
}

bootstrap();
