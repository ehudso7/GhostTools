'use client';

import { useState } from 'react';
import { useRewardful } from '@/lib/use-rewardful';
import { CheckIcon } from '@heroicons/react/24/solid';

interface PricingTier {
  name: string;
  id: 'starter' | 'pro';
  price: string;
  description: string;
  features: string[];
  mostPopular: boolean;
}

const tiers: PricingTier[] = [
  {
    name: 'Starter',
    id: 'starter',
    price: '$9.99',
    description: 'Perfect for individuals and small businesses.',
    features: [
      'Up to 20 uses per month',
      'Access to AgentWrite',
      'Access to PodScribe',
      'Basic support via email',
      'Pay monthly, cancel anytime',
    ],
    mostPopular: false,
  },
  {
    name: 'Pro',
    id: 'pro',
    price: '$29.99',
    description: 'For professionals and growing businesses.',
    features: [
      'Unlimited usage',
      'Access to all tools',
      'Advanced support',
      'Early access to new tools',
      'API access (coming soon)',
      'Cancel anytime',
    ],
    mostPopular: true,
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { referralId, isLoaded } = useRewardful();

  const handleSubscribe = async (planId: 'starter' | 'pro') => {
    setLoading(planId);
    setError('');
    
    try {
      const res = await fetch('/api/stripe/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          planId,
          referral: referralId || undefined 
        }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to initiate subscription');
      }
      
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      setError('Failed to initialize subscription. Please try again.');
      console.error(err);
      setLoading(null);
    }
  };

  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-blue-600">Pricing</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Simple pricing, powerful tools
          </p>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-gray-600">
          Choose the plan that's right for you. All plans include access to our core tools.
        </p>
        
        {error && (
          <div className="mt-6 mx-auto max-w-md text-center">
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded" role="alert">
              <p>{error}</p>
            </div>
          </div>
        )}
        
        <div className="isolate mx-auto mt-10 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-2">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`flex flex-col justify-between rounded-3xl bg-white p-8 ring-1 ring-gray-200 xl:p-10 ${
                tier.mostPopular ? 'ring-2 ring-blue-600' : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-x-4">
                  <h3 className="text-lg font-semibold leading-8 text-gray-900">
                    {tier.name}
                  </h3>
                  {tier.mostPopular ? (
                    <p className="rounded-full bg-blue-600/10 px-2.5 py-1 text-xs font-semibold leading-5 text-blue-600">
                      Most popular
                    </p>
                  ) : null}
                </div>
                <p className="mt-4 text-sm leading-6 text-gray-600">
                  {tier.description}
                </p>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight text-gray-900">{tier.price}</span>
                  <span className="text-sm font-semibold leading-6 text-gray-600">/month</span>
                </p>
                <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-x-3">
                      <CheckIcon className="h-6 w-5 flex-none text-blue-600" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => handleSubscribe(tier.id)}
                disabled={loading !== null}
                className={`mt-8 block w-full rounded-md py-3 px-3 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  tier.mostPopular
                    ? 'bg-blue-600 text-white hover:bg-blue-500 focus-visible:outline-blue-600'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 focus-visible:outline-blue-600'
                }`}
              >
                {loading === tier.id ? 'Processing...' : `Subscribe to ${tier.name}`}
              </button>
            </div>
          ))}
        </div>
        
        <div className="mt-16 mx-auto max-w-2xl text-center">
          <h3 className="text-lg font-semibold text-gray-900">Need a custom plan?</h3>
          <p className="mt-2 text-gray-600">
            Contact us for custom pricing options for larger teams or specific requirements.
          </p>
          <a
            href="mailto:support@ghosttools.com"
            className="mt-4 inline-block text-blue-600 hover:text-blue-500"
          >
            Contact Sales →
          </a>
        </div>
      </div>
    </div>
  );
}