import OpenAI from 'openai';

// Create a singleton instance of the OpenAI client
let openaiInstance: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is missing');
    }
    
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  
  return openaiInstance;
}

// Helper function for text generation using chat completions
export async function generateText(prompt: string, options: {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  system_message?: string;
}) {
  const openai = getOpenAIClient();
  
  const {
    model = 'gpt-4o',
    temperature = 0.7,
    max_tokens = 2000,
    system_message = 'You are a helpful AI assistant for GhostTools.',
  } = options;
  
  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: system_message,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature,
      max_tokens,
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
}

// Product description generator for AgentWrite
export async function generateProductDescription({
  productName,
  keywords,
  targetAudience,
  tone,
  wordCount = 200,
}: {
  productName: string;
  keywords: string[];
  targetAudience: string;
  tone: string;
  wordCount?: number;
}) {
  const prompt = `
    Generate a compelling product description for ${productName}.
    
    Keywords to include: ${keywords.join(', ')}
    Target audience: ${targetAudience}
    Tone: ${tone}
    Word count: approximately ${wordCount} words
    
    The description should highlight the product's features, benefits, and unique selling points.
    It should be engaging and persuasive, encouraging the reader to learn more or make a purchase.
  `;
  
  const systemMessage = `
    You are an expert copywriter specializing in product descriptions.
    You excel at crafting persuasive, engaging, and SEO-friendly product descriptions.
    Your task is to create a product description that incorporates the specified keywords,
    appeals to the target audience, and maintains the requested tone.
  `;
  
  return await generateText(prompt, {
    system_message: systemMessage,
    temperature: 0.8,
  });
}

// Podcast transcription and summarization for PodScribe
export async function transcribePodcast(audioUrl: string) {
  const openai = getOpenAIClient();
  
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: await fetchAudioFile(audioUrl),
      model: 'whisper-1',
    });
    
    return transcription.text;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
}

// Helper to fetch audio file
async function fetchAudioFile(url: string) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  return new File([buffer], 'audio.mp3', { type: 'audio/mpeg' });
}

// Generate podcast summary from transcription
export async function summarizePodcast(transcription: string, options: {
  bulletPoints?: boolean;
  includeTimestamps?: boolean;
  maxLength?: number;
}) {
  const {
    bulletPoints = true,
    includeTimestamps = false,
    maxLength = 500,
  } = options;
  
  const format = bulletPoints ? 'bullet points' : 'paragraphs';
  
  const prompt = `
    Summarize the following podcast transcription in ${format}.
    
    ${includeTimestamps ? 'Include approximate timestamps for key topics and discussions.' : ''}
    
    Keep the summary concise, focusing on the main topics, key insights, and interesting discussions.
    The summary should be approximately ${maxLength} words.
    
    Transcription:
    ${transcription}
  `;
  
  const systemMessage = `
    You are an expert podcast producer and editor.
    Your task is to create a concise, informative summary of a podcast episode
    based on its transcription. Focus on the main topics, key insights, and interesting discussions.
    Identify the most valuable information that would help a potential listener
    decide whether the episode is worth their time.
  `;
  
  return await generateText(prompt, {
    system_message: systemMessage,
    temperature: 0.5,
    max_tokens: maxLength * 2,
  });
}