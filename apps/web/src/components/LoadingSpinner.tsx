'use client';

import { useState, useEffect } from 'react';

interface LoadingSpinnerProps {
  message?: string;
  showProgress?: boolean;
}

export default function LoadingSpinner({ message = 'Loading...', showProgress = true }: LoadingSpinnerProps) {
  const [progress, setProgress] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (showProgress) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) return 0;
          return prev + Math.random() * 15;
        });
      }, 200);

      return () => clearInterval(interval);
    }
  }, [showProgress]);

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(dotsInterval);
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 shadow-xl max-w-md w-full mx-4">
        <div className="text-center">
          {/* Rotating loading icon */}
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
          
          {/* Message */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {message}{dots}
          </h3>
          
          {/* Progress bar */}
          {showProgress && (
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(progress, 100)}%` }}
              ></div>
            </div>
          )}
          
          {/* Progress percentage */}
          {showProgress && (
            <p className="text-sm text-gray-600">
              {Math.round(Math.min(progress, 100))}%
            </p>
          )}
          
          {/* Hint information */}
          <p className="text-xs text-gray-500 mt-4">
            Please wait while we process your request...
          </p>
        </div>
      </div>
    </div>
  );
}

// Simplified inline loading component
export function InlineSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className={`inline-block animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`}></div>
  );
}

// Progress bar component
export function ProgressBar({ progress, message }: { progress: number; message?: string }) {
  return (
    <div className="w-full">
      {message && (
        <p className="text-sm text-gray-600 mb-2">{message}</p>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(progress, 100)}%` }}
        ></div>
      </div>
      <p className="text-xs text-gray-500 mt-1 text-right">
        {Math.round(Math.min(progress, 100))}%
      </p>
    </div>
  );
}
