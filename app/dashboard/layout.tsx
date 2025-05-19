'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transform transition-transform duration-300 ease-in-out md:translate-x-0 md:relative md:w-64`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
          <Link href="/dashboard" className="text-xl font-bold">
            GhostTools
          </Link>
          <button
            className="md:hidden text-gray-300 hover:text-white"
            onClick={toggleSidebar}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>

        <nav className="px-4 py-6 space-y-2">
          <Link
            href="/dashboard"
            className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition"
          >
            Dashboard
          </Link>
          <Link
            href="/agentwrite"
            className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition"
          >
            AgentWrite
          </Link>
          <Link
            href="/podscribe"
            className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition"
          >
            PodScribe
          </Link>
          <div className="block px-4 py-2 rounded-lg text-gray-500 cursor-not-allowed">
            GhostBlog (Coming Soon)
          </div>
        </nav>

        <div className="absolute bottom-0 w-full px-4 py-6 border-t border-gray-800">
          <a
            href="https://github.com/yourusername/ghost-tools"
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition"
          >
            GitHub
          </a>
          <a
            href="/support"
            className="block px-4 py-2 rounded-lg hover:bg-gray-800 transition"
          >
            Support
          </a>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top navigation */}
        <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6">
          <button
            className="md:hidden text-gray-600"
            onClick={toggleSidebar}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              ></path>
            </svg>
          </button>

          <div className="flex items-center">
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium mr-4">
              Beta
            </span>
            <a
              href="/profile"
              className="flex items-center text-gray-800 hover:text-blue-600"
            >
              <span className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-2">
                G
              </span>
              <span className="hidden md:inline">Guest User</span>
            </a>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}