'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function NavBar() {
  const { isConnected, address } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't show content before client-side rendering
  if (!mounted) {
    return null;
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <Link href="/" className="text-xl font-bold text-gray-900 hover:text-blue-600">
            Note3
          </Link>
          {isConnected && (
            <div className="hidden md:flex items-center space-x-4">
              <Link 
                href="/" 
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100"
              >
                My Notes
              </Link>
              <Link 
                href="/infts" 
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100"
              >
                🤖 My INFTs
              </Link>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {isConnected && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Connected:</span>
              <span className="ml-2 font-mono text-xs">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
            </div>
          )}
          <ConnectButton />
        </div>
      </div>
    </nav>
  );
}
