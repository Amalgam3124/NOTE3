'use client';

import { useState, useEffect } from 'react';

interface PageLoadingSpinnerProps {
  message?: string;
  isCompiling?: boolean;
}

export default function PageLoadingSpinner({ 
  message = 'Loading page...', 
  isCompiling = false 
}: PageLoadingSpinnerProps) {
  const [progress, setProgress] = useState(0);
  const [dots, setDots] = useState('');
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    'Initializing...',
    'Loading components...',
    'Compiling modules...',
    'Building bundle...',
    'Almost ready...'
  ];

  useEffect(() => {
    // Progress bar animation
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 0;
        return prev + Math.random() * 8;
      });
    }, 300);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Dots animation
    const dotsInterval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(dotsInterval);
  }, []);

  useEffect(() => {
    // Step animation
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % steps.length);
    }, 2000);

    return () => clearInterval(stepInterval);
  }, [steps.length]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 border border-gray-200">
        <div className="text-center">
          {/* Rotating loading icon */}
          <div className="inline-block animate-spin rounded-full h-20 w-20 border-4 border-blue-200 border-t-blue-600 mb-6"></div>
          
          {/* Message */}
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            {message}{dots}
          </h3>

          {/* Current step */}
          <div className="mb-6">
            <p className="text-sm text-blue-600 font-medium mb-2">
              {steps[currentStep]}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min(progress, 100)}%` }}
              ></div>
            </div>
          </div>
          
          {/* Progress percentage */}
          <div className="mb-4">
            <p className="text-2xl font-bold text-blue-600">
              {Math.round(Math.min(progress, 100))}%
            </p>
          </div>

          {/* Compilation status */}
          {isCompiling && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                🔧 Compiling modules... This may take a few moments
              </p>
            </div>
          )}
          
          {/* Hint information */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>Please wait while we prepare your page</p>
            <p>This ensures the best performance and experience</p>
          </div>

          {/* Loading animation */}
          <div className="flex justify-center items-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simplified page loading component
export function SimplePageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
        <p className="text-lg text-gray-700">{message}</p>
      </div>
    </div>
  );
}
