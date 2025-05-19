'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRewardful } from '@/lib/use-rewardful';
import Link from 'next/link';

export default function PodScribeForm() {
  const { user, loading: userLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { referralId } = useRewardful();
  
  const [file, setFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState('');
  const [summary, setSummary] = useState('');
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleBuy = async () => {
    try {
      const res = await fetch('/api/stripe/podscribe-checkout', {
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
      setError('Please purchase credits to transcribe and summarize audio.');
      return;
    }
    
    if (!file) {
      setError('Please select an audio file.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('/api/podscribe', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to process audio file');
      }
      
      const data = await res.json();
      setTranscription(data.transcription);
      setSummary(data.summary);
      
      // Reset payment success since it's been used
      setPaymentSuccess(false);
    } catch (err: any) {
      setError(err.message || 'Failed to process audio file. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="mx-auto max-w-2xl p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">PodScribe: AI Podcast Transcription & Summarization</h1>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      {paymentSuccess && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6" role="alert">
          <p>Payment successful! You can now transcribe and summarize your podcast.</p>
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
          <label htmlFor="audioFile" className="block text-sm font-medium text-gray-700">
            Upload Audio File
          </label>
          <input
            type="file"
            id="audioFile"
            accept="audio/*"
            onChange={handleFileChange}
            className="mt-1 block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
          />
          <p className="mt-1 text-sm text-gray-500">
            Supported formats: MP3, WAV, M4A (Max 25MB)
          </p>
        </div>
        
        {showPaymentButton && (
          <button
            type="button"
            onClick={handleBuy}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
          >
            Process Audio ($7)
          </button>
        )}
        
        {(!showPaymentButton || paymentSuccess) && (
          <button
            type="submit"
            disabled={loading || !file}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full disabled:bg-blue-300"
          >
            {loading ? 'Processing...' : 'Transcribe & Summarize'}
          </button>
        )}
      </form>
      
      {transcription && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Transcription:</h2>
          <div className="bg-gray-100 p-4 rounded whitespace-pre-wrap max-h-60 overflow-y-auto">
            {transcription}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(transcription)}
            className="mt-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-3 rounded focus:outline-none focus:shadow-outline text-sm"
          >
            Copy Transcription
          </button>
        </div>
      )}
      
      {summary && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Summary:</h2>
          <div className="bg-gray-100 p-4 rounded whitespace-pre-wrap">
            {summary}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(summary)}
            className="mt-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-3 rounded focus:outline-none focus:shadow-outline text-sm"
          >
            Copy Summary
          </button>
        </div>
      )}
    </div>
  );
}