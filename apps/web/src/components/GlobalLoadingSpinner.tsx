'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface GlobalLoadingSpinnerProps {
  children: React.ReactNode;
}

export default function GlobalLoadingSpinner({ children }: GlobalLoadingSpinnerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');
  const pathname = usePathname();

  useEffect(() => {
    // Show loading state when path changes
    setIsLoading(true);
    setLoadingMessage('Loading page...');

    // Simulate page loading time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [pathname]);

  // Monitor page loading state
  useEffect(() => {
    const handleStart = () => {
      setIsLoading(true);
      setLoadingMessage('Loading page...');
    };

    const handleComplete = () => {
      setIsLoading(false);
    };

    // Monitor route changes
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleStart);
      window.addEventListener('load', handleComplete);
      
      return () => {
        window.removeEventListener('beforeunload', handleStart);
        window.removeEventListener('load', handleComplete);
      };
    }
  }, []);

  return (
    <>
      {isLoading && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 border border-gray-200">
            <div className="text-center">
              {/* Rotating loading icon */}
              <div className="inline-block animate-spin rounded-full h-20 w-20 border-4 border-blue-200 border-t-blue-600 mb-6"></div>
              
              {/* Message */}
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {loadingMessage}
              </h3>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full animate-pulse"></div>
              </div>
              
              {/* Hint information */}
              <div className="text-xs text-gray-500 space-y-1">
                <p>Please wait while we prepare your page</p>
                <p>This ensures the best performance and experience</p>
              </div>

              {/* Loading animation */}
              <div className="flex justify-center space-x-1 mt-4">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  );
}

// Simplified loading component
export function SimpleLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-[9999]">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
        <p className="text-lg text-gray-700">{message}</p>
      </div>
    </div>
  );
}
