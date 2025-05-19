const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding mock data...');
  
  // Create a test user if one doesn't exist yet
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
    },
  });
  
  console.log(`Created/Updated user: ${user.email}`);
  
  // Add credits
  const credits = await prisma.credits.upsert({
    where: { userId: user.id },
    update: { amount: 50 },
    create: {
      userId: user.id,
      amount: 50,
    },
  });
  
  console.log(`Credits set to: ${credits.amount}`);
  
  // Add subscription
  const subscription = await prisma.subscription.upsert({
    where: { stripeId: 'mock_sub_123' },
    update: {
      status: 'active',
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
    create: {
      userId: user.id,
      stripeId: 'mock_sub_123',
      status: 'active',
      planId: 'pro',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  });
  
  console.log(`Subscription status: ${subscription.status}`);
  
  // Generate some mock usage history
  await prisma.usageHistory.deleteMany({
    where: { userId: user.id },
  });
  
  const tools = ['agentwrite', 'podscribe'];
  const creditsOptions = [1, 2, 3, 5, 10];
  
  // Create 10 mock usage entries
  for (let i = 0; i < 10; i++) {
    const daysAgo = Math.floor(Math.random() * 30); // Random day within the last month
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    
    const tool = tools[Math.floor(Math.random() * tools.length)];
    const creditsUsed = creditsOptions[Math.floor(Math.random() * creditsOptions.length)];
    
    await prisma.usageHistory.create({
      data: {
        userId: user.id,
        toolName: tool,
        creditsUsed,
        createdAt: date,
        metadata: tool === 'agentwrite' 
          ? JSON.stringify({ product: 'Sample Product', wordCount: 150 })
          : JSON.stringify({ duration: '12:30', wordCount: 2450 }),
      },
    });
  }
  
  console.log('Created 10 usage history entries');
  
  // Create payment history
  await prisma.paymentHistory.deleteMany({
    where: { userId: user.id },
  });
  
  // Subscription payment
  await prisma.paymentHistory.create({
    data: {
      userId: user.id,
      stripeSessionId: 'mock_session_123',
      stripeSubscriptionId: 'mock_sub_123',
      amount: 2999, // $29.99
      status: 'completed',
      type: 'subscription',
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
    },
  });
  
  // One-time payment
  await prisma.paymentHistory.create({
    data: {
      userId: user.id,
      stripeSessionId: 'mock_session_456',
      amount: 1000, // $10.00
      status: 'completed',
      type: 'one-time',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    },
  });
  
  console.log('Created 2 payment history entries');
  
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });