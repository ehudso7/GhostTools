'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function Dashboard() {
  const searchParams = useSearchParams();
  const subSuccess = searchParams.get('sub_success');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  useEffect(() => {
    if (subSuccess === 'true') {
      setShowSuccessMessage(true);
      // Clear the success message after 5 seconds
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [subSuccess]);

  // Mock user data - in a real app, this would come from your authenticated user session
  const userData = {
    name: 'Guest User',
    email: 'guest@example.com',
    subscription: 'pro', // 'none', 'starter', or 'pro'
    credits: 20,
    usageThisMonth: 8,
  };

  // Mock usage metrics
  const metrics = [
    { 
      label: 'Descriptions Generated', 
      value: 12, 
      change: '+33%', 
      isPositive: true,
      icon: '📝'
    },
    { 
      label: 'Minutes Transcribed', 
      value: 47, 
      change: '+18%', 
      isPositive: true,
      icon: '🎙️'
    },
    { 
      label: userData.subscription !== 'none' ? 'Subscription Status' : 'Credits Remaining', 
      value: userData.subscription !== 'none' ? 'Active' : userData.credits, 
      change: userData.subscription !== 'none' ? userData.subscription.charAt(0).toUpperCase() + userData.subscription.slice(1) : '-2', 
      isPositive: userData.subscription !== 'none',
      icon: userData.subscription !== 'none' ? '✓' : '🪙'
    },
  ];

  // Tool cards
  const tools = [
    {
      title: 'AgentWrite',
      description: 'Generate high-converting product descriptions for e-commerce with just a few inputs.',
      icon: '📝',
      status: 'active',
      link: '/agentwrite',
      color: 'blue',
    },
    {
      title: 'PodScribe',
      description: 'Transcribe and summarize podcast episodes with advanced AI.',
      icon: '🎙️',
      status: 'active',
      link: '/podscribe',
      color: 'purple',
    },
    {
      title: 'GhostBlog',
      description: 'Generate complete blog posts based on your topic and outline.',
      icon: '📰',
      status: 'coming-soon',
      link: '#',
      color: 'gray',
    },
  ];

  return (
    <div className="space-y-8">
      {showSuccessMessage && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">
                Subscription successful! Your account has been updated.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600">Welcome to GhostTools, your AI content creation suite</p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-4">
          {userData.subscription === 'none' && (
            <Link 
              href="/pricing" 
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
            >
              Subscribe Now
            </Link>
          )}
          <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition">
            Buy More Credits
          </button>
        </div>
      </div>

      {/* Subscription Status Banner */}
      {userData.subscription !== 'none' && (
        <div className={`p-4 rounded-lg shadow-sm ${
          userData.subscription === 'pro' 
            ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white' 
            : 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800'
        }`}>
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-3 md:mb-0">
              <h2 className="font-bold text-lg">{userData.subscription === 'pro' ? 'Pro Plan' : 'Starter Plan'}</h2>
              <p>{userData.subscription === 'pro' 
                ? 'You have unlimited access to all tools' 
                : `You've used ${userData.usageThisMonth}/20 credits this month`}</p>
            </div>
            {userData.subscription === 'starter' && (
              <Link 
                href="/pricing"
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium"
              >
                Upgrade to Pro
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">{metric.label}</p>
              <span className="text-2xl">{metric.icon}</span>
            </div>
            <div className="flex items-baseline mt-2">
              <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              <span className={`ml-2 text-sm font-medium ${metric.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {metric.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Tools */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool, index) => (
            <div 
              key={index} 
              className={`bg-white rounded-xl shadow-sm overflow-hidden border-t-4 ${
                tool.status === 'active' 
                  ? tool.color === 'blue' 
                    ? 'border-blue-500' 
                    : 'border-purple-500' 
                  : 'border-gray-300'
              }`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl">{tool.icon}</span>
                  {tool.status === 'active' ? (
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                      Coming Soon
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">{tool.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{tool.description}</p>
                {tool.status === 'active' ? (
                  <Link 
                    href={tool.link} 
                    className={`inline-block ${
                      tool.color === 'blue' 
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : 'bg-purple-600 hover:bg-purple-700'
                    } text-white font-semibold py-2 px-4 rounded-lg transition`}
                  >
                    Launch Tool
                  </Link>
                ) : (
                  <button className="inline-block bg-gray-300 text-gray-600 font-semibold py-2 px-4 rounded-lg cursor-not-allowed">
                    Coming Soon
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h2>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-200">
            <div className="p-4 hover:bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900">Product description generated</p>
                  <p className="text-xs text-gray-500">Today at 10:45 AM</p>
                </div>
                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                  AgentWrite
                </span>
              </div>
            </div>
            <div className="p-4 hover:bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900">{userData.subscription !== 'none' ? 'Subscription started' : 'Purchased 10 credits'}</p>
                  <p className="text-xs text-gray-500">Yesterday at 2:30 PM</p>
                </div>
                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                  Payment
                </span>
              </div>
            </div>
            <div className="p-4 hover:bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900">Podcast episode transcribed</p>
                  <p className="text-xs text-gray-500">May 15, 2025</p>
                </div>
                <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                  PodScribe
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Affiliate Program Section */}
      <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg shadow-sm p-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <h2 className="text-lg font-bold text-gray-800">Affiliate Program</h2>
            <p className="text-gray-600">Earn 20% commission when others subscribe using your referral link.</p>
          </div>
          <div>
            <button 
              className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg"
              onClick={() => {
                // In a real app, this would generate and copy the affiliate link
                alert('Your affiliate link has been copied to clipboard!');
              }}
            >
              Get Your Referral Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}