'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Map error codes to user-friendly messages
const errorMessages: Record<string, string> = {
  'Configuration': 'There is a problem with the server configuration.',
  'AccessDenied': 'You do not have permission to sign in.',
  'Verification': 'The sign-in link is no longer valid.',
  'Default': 'An error occurred while trying to sign in.',
};

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'Default';
  
  // Get the error message
  const errorMessage = errorMessages[error] || errorMessages.Default;
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-4xl font-bold text-gray-900">
            GhostTools
          </Link>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">
            Authentication Error
          </h2>
        </div>
        
        <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10 text-center">
          <svg
            className="mx-auto h-12 w-12 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Sign-in Failed
            </h3>
            <p className="text-gray-600 mb-6">
              {errorMessage}
            </p>
            
            <div className="flex justify-center space-x-4">
              <Link 
                href="/auth/signin"
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm font-medium"
              >
                Try Again
              </Link>
              <Link 
                href="/"
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded text-sm font-medium"
              >
                Return Home
              </Link>
            </div>
          </div>
        </div>
        
        <p className="mt-6 text-center text-sm text-gray-600">
          Need help?{' '}
          <a href="mailto:support@ghosttools.com" className="font-medium text-blue-600 hover:text-blue-500">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}