import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import Script from 'next/script';
import { Providers } from './providers';
import UserMenu from './components/UserMenu';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GhostTools - AI Powered Tools for Content Creation',
  description: 'Suite of AI tools to help you create better content, faster',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Rewardful affiliate tracking script */}
      </head>
      <body className={inter.className}>
        <Providers>
          {/* Rewardful script for affiliate tracking */}
          <Script src="https://r.wdfl.co/rw.js" data-rewardful="55cfdc" />
          <Script id="rewardful-queue" strategy="beforeInteractive">
            {`(function(w,r){w._rwq=r;w[r]=w[r]||function(){(w[r].q=w[r].q||[]).push(arguments)}})(window,'rewardful');`}
          </Script>
          <header className="bg-gray-800 text-white p-4 shadow-md">
            <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
              <Link href="/" className="text-xl font-bold mb-4 md:mb-0">GhostTools</Link>
              <div className="flex items-center">
                <nav className="mr-6">
                  <ul className="flex flex-wrap space-x-4 md:space-x-6 justify-center">
                    <li><Link href="/dashboard" className="hover:text-blue-300 transition">Dashboard</Link></li>
                    <li><Link href="/agentwrite" className="hover:text-blue-300 transition">AgentWrite</Link></li>
                    <li><Link href="/podscribe" className="hover:text-blue-300 transition">PodScribe</Link></li>
                    <li><Link href="/pricing" className="hover:text-blue-300 transition">Pricing</Link></li>
                    <li><a href="#" className="text-gray-400 cursor-not-allowed">GhostBlog (Soon)</a></li>
                  </ul>
                </nav>
                <UserMenu />
              </div>
            </div>
          </header>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}