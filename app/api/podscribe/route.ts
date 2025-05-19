import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/sentry';
import { rateLimit } from '@/lib/rate-limit';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create a rate limiter for this endpoint
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    try {
      await limiter.check(req, 10); // 10 requests per minute per IP
    } catch {
      return NextResponse.json(
        { error: 'Too many requests, please try again later' },
        { status: 429 }
      );
    }
    
    // Get user session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get user data with subscription and credits
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        credits: true,
        subscriptions: {
          where: {
            OR: [
              { status: 'active' },
              { 
                status: 'canceled',
                endDate: { gt: new Date() }
              }
            ]
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        }
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if user has an active subscription or enough credits
    const activeSubscription = user.subscriptions[0];
    const userCredits = user.credits?.amount || 0;
    
    const hasPro = activeSubscription?.planId === 'pro';
    const hasStarter = activeSubscription?.planId === 'starter';
    const hasCredits = userCredits > 0;
    
    if (!hasPro && !hasStarter && !hasCredits) {
      return NextResponse.json(
        { error: 'Insufficient credits. Please purchase credits or subscribe to a plan.' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Check file type
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an MP3, WAV, or M4A file.' },
        { status: 400 }
      );
    }
    
    // Check file size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 25MB.' },
        { status: 400 }
      );
    }
    
    // Convert file to ArrayBuffer
    const buffer = await file.arrayBuffer();
    
    // Create a Blob with the file data
    const blob = new Blob([buffer]);
    
    // Transcribe using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: blob as any,
      model: 'whisper-1',
    });
    
    // Generate summary using OpenAI Chat
    const summaryResponse = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert in summarizing podcast content. Create a concise, well-structured summary that captures the main points, key insights, and important discussions from the transcript. Format with bullet points for key takeaways.',
        },
        {
          role: 'user',
          content: `Summarize this podcast transcript: ${transcription.text}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });
    
    // If user doesn't have pro plan and has used a credit, deduct it
    if (!hasPro && userCredits > 0) {
      await prisma.credits.update({
        where: { userId: user.id },
        data: { amount: { decrement: 1 } },
      });
    }
    
    // Record usage
    await prisma.usageHistory.create({
      data: {
        userId: user.id,
        toolName: 'podscribe',
        creditsUsed: hasPro ? 0 : 1,
        metadata: {
          fileType: file.type,
          fileSize: file.size,
          durationSecs: transcription.text.length / 15, // Rough estimate
        },
      },
    });
    
    return NextResponse.json({
      transcription: transcription.text,
      summary: summaryResponse.choices[0].message.content,
    });
  } catch (error) {
    logError(error, { context: 'podscribe-api' });
    return NextResponse.json(
      { error: 'Failed to process audio file' },
      { status: 500 }
    );
  }
}