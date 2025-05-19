'use client';

import Link from 'next/link';

export default function VerifyRequest() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-4xl font-bold text-gray-900">
            GhostTools
          </Link>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">
            Check your email
          </h2>
        </div>
        
        <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10 text-center">
          <svg
            className="mx-auto h-12 w-12 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Sign-in link sent!
            </h3>
            <p className="text-gray-600 mb-6">
              A sign-in link has been sent to your email address.
              Please check your inbox and click the link to continue.
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h4 className="text-sm font-medium text-gray-800 mb-2">
                Can't find the email?
              </h4>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>Check your spam or junk folder</li>
                <li>Make sure you entered the correct email address</li>
                <li>Wait a few minutes for the email to arrive</li>
              </ul>
            </div>
            
            <div className="flex justify-center">
              <Link 
                href="/auth/signin"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                ← Return to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}