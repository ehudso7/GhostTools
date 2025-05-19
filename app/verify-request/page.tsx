import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Check Your Email | GhostTools',
  description: 'Check your email for a login link from GhostTools.',
};

export default function VerifyRequestPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Check your email
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            A sign in link has been sent to your email address.
          </p>
        </div>

        <div className="mt-8 bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <svg
                className="h-8 w-8 text-green-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-gray-600 mb-4">
              Click the link in the email to sign in to your account.
            </p>
            <p className="text-gray-600 mb-6">
              If you don&apos;t see the email, check your spam folder.
            </p>
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Return to homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}