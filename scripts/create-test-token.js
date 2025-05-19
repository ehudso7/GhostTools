const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const prisma = new PrismaClient();

async function createTestToken() {
  try {
    console.log('Creating test authentication token...');
    
    // Get or create the test user
    const user = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        name: 'Test User',
      },
    });
    
    console.log(`Found user: ${user.email}`);
    
    // Get NEXTAUTH_SECRET from .env.local
    let secret = process.env.NEXTAUTH_SECRET;
    
    if (!secret) {
      // Try to read from .env.local
      try {
        const envFile = fs.readFileSync('.env.local', 'utf8');
        const secretMatch = envFile.match(/NEXTAUTH_SECRET=(.+)\n/);
        
        if (secretMatch && secretMatch[1]) {
          secret = secretMatch[1];
        } else {
          // Generate a random secret if not found
          secret = require('crypto').randomBytes(32).toString('hex');
          console.log('Generated random secret for token signing');
        }
      } catch (err) {
        // Generate a random secret if .env.local doesn't exist
        secret = require('crypto').randomBytes(32).toString('hex');
        console.log('Generated random secret for token signing');
      }
    }
    
    // Create a JWT token
    const token = jwt.sign(
      {
        name: user.name,
        email: user.email,
        picture: user.image,
        sub: user.id,
      },
      secret,
      { expiresIn: '30d' }
    );
    
    console.log('\nTest token created successfully!');
    console.log('\n------------- COPY THIS TOKEN -------------');
    console.log(token);
    console.log('------------------------------------------');
    console.log('\nYou can use this token for testing API requests with tools like Postman or curl:');
    console.log('curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/user');
  } catch (error) {
    console.error('Error creating test token:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestToken();