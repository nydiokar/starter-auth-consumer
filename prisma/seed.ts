import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [userRole, adminRole] = await Promise.all([
    prisma.role.upsert({ where: { name: 'user' }, update: {}, create: { name: 'user' } }),
    prisma.role.upsert({ where: { name: 'admin' }, update: {}, create: { name: 'admin' } }),
  ]);
  console.log('Seeded roles:', userRole.name, adminRole.name);
}

main().finally(async () => {
  await prisma.$disconnect();
});

