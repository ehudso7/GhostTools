'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';

export default function AccountPage() {
  const { data: session, status } = useSession();
  const [usageHistory, setUsageHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  // Fetch usage history
  useEffect(() => {
    const fetchUsageHistory = async () => {
      if (!session?.user) return;
      
      setHistoryLoading(true);
      try {
        const res = await fetch('/api/user/history');
        
        if (!res.ok) {
          throw new Error('Failed to fetch usage history');
        }
        
        const data = await res.json();
        setUsageHistory(data.history || []);
      } catch (err) {
        console.error(err);
        setHistoryError('Unable to load usage history');
      } finally {
        setHistoryLoading(false);
      }
    };
    
    if (session?.user) {
      fetchUsageHistory();
    }
  }, [session]);

  if (status === 'loading') {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (status !== 'authenticated') {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded">
          <p>You need to be logged in to view this page.</p>
          <Link 
            href="/login"
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          Sign Out
        </button>
      </div>

      <div className="bg-white shadow rounded-lg mb-8">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="mt-1 text-gray-900">{session?.user?.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <p className="mt-1 text-gray-900">{session?.user?.name || 'Not provided'}</p>
            </div>
            {session?.user?.image && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Profile Picture</label>
                <div className="mt-1">
                  <Image 
                    src={session.user.image} 
                    alt="Profile" 
                    width={60} 
                    height={60} 
                    className="rounded-full"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg mb-8">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Subscription & Credits</h2>
          
          {/* For demo purposes, we'll show a mock subscription */}
          <div className="mb-6">
            <div className="bg-blue-50 p-4 rounded mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium text-blue-800">
                    Pro Plan
                  </span>
                  <p className="text-sm text-blue-700 mt-1">
                    Status: Active
                  </p>
                  <p className="text-sm text-blue-700">
                    Next billing date: {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </p>
                </div>
                <Link 
                  href="/pricing"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  Manage Subscription
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Usage History</h2>
          
          {historyLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : historyError ? (
            <div className="bg-red-100 text-red-700 p-4 rounded">
              <p>{historyError}</p>
            </div>
          ) : usageHistory.length === 0 ? (
            <div className="bg-gray-50 p-4 text-center rounded">
              <p className="text-gray-600">No usage history yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tool
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Credits Used
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {usageHistory.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.toolName === 'agentwrite' ? 'AgentWrite' : 'PodScribe'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{item.creditsUsed}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}