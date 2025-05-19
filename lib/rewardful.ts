import { env } from './env-validation';

/**
 * Interface for Rewardful conversion data
 */
interface RewardfulConversionData {
  referral: string;
  customer_id?: string;
  customer_email?: string;
  value: number;
  currency?: string;
  order_id?: string;
  first_order?: boolean;
  status?: 'pending' | 'paid' | 'canceled';
  meta?: Record<string, string>;
}

/**
 * Track a conversion in Rewardful
 * @param data Conversion data
 * @returns API response
 */
export async function trackRewardfulConversion(data: RewardfulConversionData): Promise<any> {
  try {
    const apiKey = env().REWARDFUL_API_KEY;

    // Return early in test environment
    if (process.env.NODE_ENV !== 'production' || !apiKey) {
      console.log('Skipping Rewardful API call in non-production environment');
      return { success: true, dev: true };
    }

    // Make API request to Rewardful
    const response = await fetch('https://api.rewardful.com/v1/conversions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Rewardful API error:', errorData);
      throw new Error(`Rewardful API error: ${errorData.error || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error tracking Rewardful conversion:', error);
    // Don't throw error - we don't want to fail the checkout process
    // if affiliate tracking fails
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Track Stripe checkout conversion in Rewardful
 * @param session Stripe Checkout Session
 * @param userId User ID
 * @param userEmail User email
 * @returns API response
 */
export async function trackStripeCheckoutConversion(
  referralId: string,
  sessionId: string,
  amount: number,
  userId: string,
  userEmail?: string,
  isSubscription = false
): Promise<any> {
  return trackRewardfulConversion({
    referral: referralId,
    customer_id: userId,
    customer_email: userEmail,
    value: amount / 100, // Convert from cents to dollars
    currency: 'USD',
    order_id: sessionId,
    first_order: true, // Assuming first order, modify as needed
    status: 'paid',
    meta: {
      type: isSubscription ? 'subscription' : 'one-time',
    },
  });
}