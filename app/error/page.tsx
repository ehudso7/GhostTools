import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Error | GhostTools',
  description: 'Something went wrong with your authentication.',
};

export default function ErrorPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const error = searchParams.error;
  
  if (!error) {
    redirect('/');
  }

  let errorTitle = 'Authentication Error';
  let errorMessage = 'An unknown error occurred during authentication.';

  // Handle specific error types
  if (error === 'AccessDenied') {
    errorTitle = 'Access Denied';
    errorMessage = 'You do not have permission to sign in.';
  } else if (error === 'CredentialsSignin') {
    errorTitle = 'Sign In Failed';
    errorMessage = 'The credentials you provided are invalid.';
  } else if (error === 'OAuthAccountNotLinked') {
    errorTitle = 'Account Not Linked';
    errorMessage = 'This email is already associated with another account.';
  } else if (error === 'EmailSignin') {
    errorTitle = 'Email Sign In Failed';
    errorMessage = 'The email sign in failed. Please try again.';
  } else if (error === 'CallbackRouteError') {
    errorTitle = 'Callback Error';
    errorMessage = 'There was a problem with the sign in callback. Please try again.';
  } else if (error === 'OAuthSignin') {
    errorTitle = 'OAuth Sign In Failed';
    errorMessage = 'The OAuth sign in failed. Please try again.';
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            {errorTitle}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {errorMessage}
          </p>
        </div>

        <div className="mt-8 bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
              <svg
                className="h-8 w-8 text-red-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p className="text-gray-600 mb-6">
              Please try signing in again or contact support if the problem persists.
            </p>
            <div className="flex justify-center space-x-4">
              <Link
                href="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to login
              </Link>
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to homepage
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}