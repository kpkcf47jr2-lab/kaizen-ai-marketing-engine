import { PrismaClient, LedgerType, Role } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Guard: never run seed in production unless explicitly forced
  if (process.env.NODE_ENV === 'production' && !process.env.FORCE_SEED) {
    console.log('⚠️  Skipping seed in production. Set FORCE_SEED=1 to override.');
    return;
  }

  console.log('🌱 Seeding database...');

  // Passwords from env vars (fallback to defaults for local dev only)
  const adminPwd = process.env.SEED_ADMIN_PASSWORD || 'admin123';
  const demoPwd = process.env.SEED_DEMO_PASSWORD || 'demo123';

  // Create admin user
  const adminPassword = await hash(adminPwd, 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@kaizen.ai' },
    update: {},
    create: {
      email: 'admin@kaizen.ai',
      name: 'Kaizen Admin',
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  });
  console.log(`  ✅ Admin user: ${admin.email}`);

  // Create demo user
  const demoPassword = await hash(demoPwd, 12);
  const demo = await prisma.user.upsert({
    where: { email: 'demo@kaizen.ai' },
    update: {},
    create: {
      email: 'demo@kaizen.ai',
      name: 'Demo User',
      passwordHash: demoPassword,
      role: Role.USER,
    },
  });
  console.log(`  ✅ Demo user: ${demo.email}`);

  // Give demo user some credits
  await prisma.creditLedger.create({
    data: {
      userId: demo.id,
      type: LedgerType.BONUS,
      amount: 500,
      balanceAfter: 500,
      description: 'Welcome bonus',
      referenceId: 'seed',
    },
  });
  console.log('  ✅ Demo credits: 500');

  // Create demo brand profile
  await prisma.brandProfile.upsert({
    where: { userId: demo.id },
    update: {},
    create: {
      userId: demo.id,
      brandName: 'Kaizen Demo Store',
      niche: 'Technology',
      tone: 'professional',
      language: 'en',
      targetAudience: 'Small business owners aged 25-45',
      products: JSON.stringify([
        { name: 'AI Marketing Suite', description: 'Automated content generation' },
        { name: 'Social Scheduler', description: 'Multi-platform posting' },
      ]),
      masterPrompt: 'Create engaging short-form video content showcasing our AI marketing tools. Use a modern, clean aesthetic with subtle tech elements.',
      ctas: ['Visit kaizen.ai', 'Start free trial', 'Learn more'],
      links: ['https://kaizen.ai'],
      hashtagsDefault: ['#AIMarketing', '#ContentCreation', '#Kaizen', '#Automation'],
    },
  });
  console.log('  ✅ Demo brand profile created');

  console.log('\n🎉 Seed complete!');
  console.log('   Admin: admin@kaizen.ai');
  console.log('   Demo:  demo@kaizen.ai');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
