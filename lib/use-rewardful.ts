import { useState, useEffect } from 'react';

// Declare global types for Rewardful
declare global {
  interface Window {
    _rwq: any[];
    rewardful: (event: string, callback: Function) => void;
    Rewardful: {
      referral: string | null;
      affiliate: string | null;
    };
  }
}

/**
 * Hook to get Rewardful referral information
 * @returns Object containing referral information from Rewardful
 */
export function useRewardful() {
  const [referralId, setReferralId] = useState<string | null>(null);
  const [affiliateId, setAffiliateId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check if Rewardful is loaded
    if (typeof window !== 'undefined' && window.rewardful) {
      // Wait for Rewardful to be ready
      window.rewardful('ready', function() {
        setReferralId(window.Rewardful.referral);
        setAffiliateId(window.Rewardful.affiliate);
        setIsLoaded(true);
      });
    } else {
      // If not in browser or Rewardful not available
      setIsLoaded(true);
    }
  }, []);

  return {
    referralId,
    affiliateId,
    isLoaded
  };
}