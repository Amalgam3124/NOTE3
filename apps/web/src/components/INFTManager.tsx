'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
// Dynamic import to avoid SSR issues
// Define types locally to avoid SSR issues
type INFTInfo = {
  token_id: string;
  metadata: {
    name: string;
    description: string;
    image?: string;
    intelligence: {
      capabilities: string[];
      model_version: string;
      compute_requirements: {
        memory: number;
        compute_units: number;
      };
      data_sources: string[];
      prompt_template?: string;
      is_encrypted?: boolean;
    };
    attributes: any[];
  };
  note_reference: {
    note_id: string;
  };
  created_at: number;
};
import LoadingSpinner from './LoadingSpinner';

export default function INFTManager() {
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [ownedINFTs, setOwnedINFTs] = useState<INFTInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  // Fix hydration issue
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const loadOwnedINFTs = useCallback(async () => {
    if (!isConnected || !walletClient || !address) {
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const { getOwnedINFTs } = await import('@onchain-notes/sdk');
      const infts = await getOwnedINFTs(
        address,
        walletClient
      );
      setOwnedINFTs(infts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load INFTs';
      setError(errorMessage);
      console.error('Failed to load owned INFTs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, walletClient, address]);

  useEffect(() => {
    if (isConnected && walletClient) {
      loadOwnedINFTs();
    }
  }, [isConnected, walletClient, loadOwnedINFTs]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getCapabilityColor = (capability: string) => {
    const colors = {
      'summary': 'bg-blue-100 text-blue-800',
      'qa': 'bg-green-100 text-green-800',
      'translation': 'bg-purple-100 text-purple-800',
      'analysis': 'bg-orange-100 text-orange-800',
      'generation': 'bg-pink-100 text-pink-800',
      'default': 'bg-gray-100 text-gray-800'
    };
    return colors[capability as keyof typeof colors] || colors.default;
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">My INFTs</h1>
          <div className="px-4 py-2 bg-gray-300 rounded-lg animate-pulse">
            Loading...
          </div>
        </div>
        <div className="text-center py-12">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">My INFTs</h1>
          <div className="px-4 py-2 bg-gray-300 rounded-lg">
            Not Connected
          </div>
        </div>
        <div className="text-center py-12">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md mx-auto">
            <p className="text-yellow-800">
              Please connect your wallet to view your INFTs.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">My INFTs</h1>
        <button
          onClick={loadOwnedINFTs}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Stats */}
      {ownedINFTs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{ownedINFTs.length}</div>
            <div className="text-sm text-blue-800">Total INFTs</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {ownedINFTs.filter(inft => inft.metadata.intelligence.capabilities.includes('summary')).length}
            </div>
            <div className="text-sm text-green-800">With Summary</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {ownedINFTs.filter(inft => inft.metadata.intelligence.capabilities.includes('qa')).length}
            </div>
            <div className="text-sm text-purple-800">With Q&A</div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* INFTs List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner message="Loading your INFTs..." />
        </div>
      ) : ownedINFTs.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 max-w-md mx-auto">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No INFTs Found</h3>
            <p className="text-gray-600 mb-4">
              You haven&apos;t converted any notes to INFTs yet. Go to a note and convert it to create your first Intelligent NFT!
            </p>
            <a
              href="/"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              View My Notes
            </a>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {ownedINFTs.map((inft) => (
            <div key={inft.token_id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              {/* INFT Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {inft.metadata.name}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {inft.metadata.description}
                  </p>
                </div>
                <div className="text-right text-xs text-gray-500 ml-4">
                  <p>#{inft.token_id}</p>
                </div>
              </div>

              {/* Image */}
              {inft.metadata.image && (
                <div className="mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={inft.metadata.image}
                    alt={inft.metadata.name}
                    className="w-full h-32 object-cover rounded-lg border border-gray-200"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Capabilities */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">AI Capabilities</h4>
                <div className="flex flex-wrap gap-1">
                  {inft.metadata.intelligence.capabilities.map((capability: string, index: number) => (
                    <span
                      key={index}
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCapabilityColor(capability)}`}
                    >
                      {capability}
                    </span>
                  ))}
                </div>
              </div>

              {/* Attributes */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Attributes</h4>
                <div className="space-y-1">
                  {inft.metadata.attributes.slice(0, 3).map((attr: any, index: number) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="text-gray-600">{attr.trait_type}:</span>
                      <span className="text-gray-900 font-medium">{attr.value}</span>
                    </div>
                  ))}
                  {inft.metadata.attributes.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{inft.metadata.attributes.length - 3} more attributes
                    </div>
                  )}
                </div>
              </div>

              {/* Note Reference */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-1">Original Note</h4>
                <p className="text-xs text-gray-600">
                  Note ID: {inft.note_reference.note_id}
                </p>
                <a
                  href={`/note/${inft.note_reference.note_id}`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  View Original Note →
                </a>
              </div>

              {/* Metadata */}
              <div className="border-t border-gray-200 pt-3">
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <div>
                    <span className="font-medium">Created:</span>
                    <br />
                    {formatDate(inft.created_at)}
                  </div>
                  <div>
                    <span className="font-medium">Model:</span>
                    <br />
                    v{inft.metadata.intelligence.model_version}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    // TODO: Implement AI interaction
                    alert('AI interaction features coming soon!');
                  }}
                  className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                >
                  🤖 Interact
                </button>
                <button
                  onClick={() => {
                    // TODO: Implement sharing
                    navigator.clipboard.writeText(`${window.location.origin}/inft/${inft.token_id}`);
                    alert('INFT link copied to clipboard!');
                  }}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  Share
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
