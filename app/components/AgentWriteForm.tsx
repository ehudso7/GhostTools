'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRewardful } from '@/lib/use-rewardful';
import Link from 'next/link';

export default function AgentWriteForm() {
  const { user, loading: userLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { referralId } = useRewardful();
  
  const [formData, setFormData] = useState({
    productName: '',
    productFeatures: '',
    targetAudience: '',
    tone: 'professional',
  });
  
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPaymentButton, setShowPaymentButton] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  
  // Check URL parameters for payment status
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    
    if (success === 'true') {
      setPaymentSuccess(true);
      setShowPaymentButton(false);
    } else if (canceled === 'true') {
      setError('Payment was canceled. Please try again.');
    }
  }, [searchParams]);
  
  // Check user subscription/credits status
  useEffect(() => {
    if (userLoading) return;
    
    if (user) {
      const hasPro = user.subscription?.planId === 'pro';
      const hasStarter = user.subscription?.planId === 'starter';
      const hasCredits = (user.credits || 0) > 0;
      
      if (hasPro || hasStarter || hasCredits) {
        setShowPaymentButton(false);
      } else {
        setShowPaymentButton(true);
      }
    }
  }, [user, userLoading]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleBuy = async () => {
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          referral: referralId || undefined,
          email: user?.email
        }),
      });
      
      if (!res.ok) {
        throw new Error('Payment initialization failed');
      }
      
      const { url } = await res.json();
      router.push(url);
    } catch (err) {
      setError('Failed to initiate payment. Please try again.');
      console.error(err);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (showPaymentButton && !paymentSuccess) {
      setError('Please purchase credits to generate a description.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/agentwrite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to generate description');
      }
      
      const data = await res.json();
      setDescription(data.description);
      
      // Reset payment success since it's been used
      setPaymentSuccess(false);
    } catch (err: any) {
      setError(err.message || 'Failed to generate description. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="mx-auto max-w-2xl p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">AgentWrite: AI Product Description Generator</h1>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      {paymentSuccess && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6" role="alert">
          <p>Payment successful! You can now generate a product description.</p>
        </div>
      )}
      
      {!userLoading && user && (
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">
                {user.subscription ? (
                  <>
                    <span className="font-medium">
                      {user.subscription.planId === 'pro' ? 'Pro Plan' : 'Starter Plan'}
                    </span>: Unlimited access
                  </>
                ) : (
                  <>
                    <span className="font-medium">Credits</span>: {user.credits || 0} remaining
                  </>
                )}
              </p>
            </div>
            <Link 
              href="/pricing" 
              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 py-1 px-2 rounded"
            >
              Upgrade
            </Link>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="productName" className="block text-sm font-medium text-gray-700">
            Product Name
          </label>
          <input
            type="text"
            id="productName"
            name="productName"
            value={formData.productName}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g., Ultra Comfort Pro Running Shoes"
          />
        </div>
        
        <div>
          <label htmlFor="productFeatures" className="block text-sm font-medium text-gray-700">
            Key Features
          </label>
          <textarea
            id="productFeatures"
            name="productFeatures"
            value={formData.productFeatures}
            onChange={handleChange}
            required
            rows={4}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="List the main features of your product"
          />
        </div>
        
        <div>
          <label htmlFor="targetAudience" className="block text-sm font-medium text-gray-700">
            Target Audience
          </label>
          <input
            type="text"
            id="targetAudience"
            name="targetAudience"
            value={formData.targetAudience}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g., Professional runners and fitness enthusiasts"
          />
        </div>
        
        <div>
          <label htmlFor="tone" className="block text-sm font-medium text-gray-700">
            Writing Tone
          </label>
          <select
            id="tone"
            name="tone"
            value={formData.tone}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="professional">Professional</option>
            <option value="casual">Casual</option>
            <option value="enthusiastic">Enthusiastic</option>
            <option value="humorous">Humorous</option>
            <option value="luxury">Luxury/Premium</option>
          </select>
        </div>
        
        {showPaymentButton && (
          <button
            type="button"
            onClick={handleBuy}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
          >
            Buy Description ($5)
          </button>
        )}
        
        {(!showPaymentButton || paymentSuccess) && (
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
          >
            {loading ? 'Generating...' : 'Generate Description'}
          </button>
        )}
      </form>
      
      {description && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Your Generated Description:</h2>
          <div className="bg-gray-100 p-4 rounded whitespace-pre-wrap">
            {description}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(description)}
            className="mt-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Copy to Clipboard
          </button>
        </div>
      )}
    </div>
  );
}