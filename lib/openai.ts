import OpenAI from 'openai';
import { env } from './env-validation';

/**
 * Supported error types for better error handling
 */
export enum OpenAIErrorType {
  INVALID_API_KEY = 'invalid_api_key',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  QUOTA_EXCEEDED = 'quota_exceeded',
  CONTENT_FILTERED = 'content_filtered',
  CONTEXT_LENGTH_EXCEEDED = 'context_length_exceeded',
  SERVER_ERROR = 'server_error',
  CLIENT_ERROR = 'client_error',
  NETWORK_ERROR = 'network_error',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown',
}

/**
 * Custom error class for OpenAI errors
 */
export class AIError extends Error {
  type: OpenAIErrorType;
  statusCode?: number;
  retriable: boolean;
  
  constructor(message: string, type: OpenAIErrorType, statusCode?: number) {
    super(message);
    this.name = 'AIError';
    this.type = type;
    this.statusCode = statusCode;
    
    // Some errors can be retried automatically
    this.retriable = [
      OpenAIErrorType.RATE_LIMIT_EXCEEDED,
      OpenAIErrorType.SERVER_ERROR,
      OpenAIErrorType.NETWORK_ERROR,
      OpenAIErrorType.TIMEOUT,
    ].includes(type);
  }
}

/**
 * Determine error type from OpenAI error response
 */
function getErrorType(error: any): OpenAIErrorType {
  if (!error) return OpenAIErrorType.UNKNOWN;
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorStatus = error.status || error.statusCode;
  
  // API key errors
  if (errorMessage.includes('api key') || errorMessage.includes('invalid key')) {
    return OpenAIErrorType.INVALID_API_KEY;
  }
  
  // Rate limits
  if (errorStatus === 429 || errorMessage.includes('rate limit')) {
    return OpenAIErrorType.RATE_LIMIT_EXCEEDED;
  }
  
  // Quota errors
  if (errorMessage.includes('quota') || errorMessage.includes('billing')) {
    return OpenAIErrorType.QUOTA_EXCEEDED;
  }
  
  // Content filtration
  if (errorMessage.includes('content filter') || errorMessage.includes('flagged')) {
    return OpenAIErrorType.CONTENT_FILTERED;
  }
  
  // Context length
  if (errorMessage.includes('context length') || errorMessage.includes('token limit')) {
    return OpenAIErrorType.CONTEXT_LENGTH_EXCEEDED;
  }
  
  // Server errors
  if (errorStatus >= 500 || errorMessage.includes('server')) {
    return OpenAIErrorType.SERVER_ERROR;
  }
  
  // Client errors
  if (errorStatus >= 400 && errorStatus < 500) {
    return OpenAIErrorType.CLIENT_ERROR;
  }
  
  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('econnreset')) {
    return OpenAIErrorType.NETWORK_ERROR;
  }
  
  // Timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return OpenAIErrorType.TIMEOUT;
  }
  
  return OpenAIErrorType.UNKNOWN;
}

/**
 * Get a user-friendly error message
 */
function getUserFriendlyErrorMessage(errorType: OpenAIErrorType): string {
  switch (errorType) {
    case OpenAIErrorType.INVALID_API_KEY:
      return 'Authentication error with AI provider. Please contact support.';
    case OpenAIErrorType.RATE_LIMIT_EXCEEDED:
      return 'Too many requests. Please try again in a few moments.';
    case OpenAIErrorType.QUOTA_EXCEEDED:
      return 'AI service quota exceeded. Please contact support.';
    case OpenAIErrorType.CONTENT_FILTERED:
      return 'Content was filtered by AI safety systems. Please modify your input.';
    case OpenAIErrorType.CONTEXT_LENGTH_EXCEEDED:
      return 'Input is too long for the AI model. Please reduce the length.';
    case OpenAIErrorType.SERVER_ERROR:
      return 'AI service temporarily unavailable. Please try again later.';
    case OpenAIErrorType.TIMEOUT:
      return 'AI request timed out. Please try again.';
    case OpenAIErrorType.NETWORK_ERROR:
      return 'Network error while connecting to AI service. Please check your connection.';
    default:
      return 'An error occurred with the AI service. Please try again later.';
  }
}

// Configure OpenAI client with validated API key
const openai = new OpenAI({
  apiKey: env().OPENAI_API_KEY,
  timeout: 30000, // 30 second timeout
  maxRetries: 2,  // Retry twice on retryable errors
});

/**
 * Wrapper for error handling in OpenAI requests
 */
async function withErrorHandling<T>(
  operation: () => Promise<T>,
  customErrorMessage?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const errorType = getErrorType(error);
    const message = customErrorMessage || getUserFriendlyErrorMessage(errorType);
    
    // Log internal error details for debugging
    console.error('OpenAI API error:', {
      type: errorType,
      status: error.status,
      message: error.message,
    });
    
    throw new AIError(message, errorType, error.status);
  }
}

/**
 * Generate product description with OpenAI
 */
export async function generateProductDescription(
  productName: string,
  productDetails: string,
  maxTokens: number = 500
): Promise<string> {
  return withErrorHandling(async () => {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a professional copywriter specializing in compelling product descriptions. Create engaging, persuasive copy that highlights benefits and features.'
        },
        {
          role: 'user',
          content: `Write a compelling product description for "${productName}". 
          
          Product details: ${productDetails}
          
          Make it persuasive, engaging, and focused on benefits to the customer. 
          Keep it concise but impactful.`
        }
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    });
    
    if (!response.choices[0]?.message?.content) {
      throw new AIError('No content generated', OpenAIErrorType.UNKNOWN);
    }
    
    return response.choices[0].message.content.trim();
  }, 'Failed to generate product description');
}

/**
 * Transcribe audio with OpenAI Whisper
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  audioFormat: string = 'mp3'
): Promise<{ text: string; duration: number }> {
  return withErrorHandling(async () => {
    // Convert Buffer to Blob with proper MIME type
    const audioBlob = new Blob([audioBuffer], { type: `audio/${audioFormat}` });
    
    // Create a File object from the Blob
    const file = new File([audioBlob], `audio.${audioFormat}`, { type: `audio/${audioFormat}` });
    
    const response = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      response_format: 'json',
    });
    
    return {
      text: response.text,
      duration: 0, // Duration would be derived from audio file metadata in a complete implementation
    };
  }, 'Failed to transcribe audio');
}

/**
 * Summarize podcast transcript
 */
export async function summarizePodcast(
  transcript: string,
  maxSummaryLength: number = 500
): Promise<string> {
  return withErrorHandling(async () => {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a podcast editor who creates concise, informative summaries of podcast episodes. Focus on the key points and main takeaways.'
        },
        {
          role: 'user',
          content: `Summarize the following podcast transcript in a way that captures the main points and key takeaways. 
          Keep the summary concise and easy to read.
          
          TRANSCRIPT:
          ${transcript}`
        }
      ],
      max_tokens: maxSummaryLength,
      temperature: 0.3,
    });
    
    if (!response.choices[0]?.message?.content) {
      throw new AIError('No content generated', OpenAIErrorType.UNKNOWN);
    }
    
    return response.choices[0].message.content.trim();
  }, 'Failed to summarize podcast');
}