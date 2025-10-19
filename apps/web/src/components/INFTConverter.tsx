'use client';

import { useState, useCallback } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { ethers } from 'ethers';
import { getClientService, getClientBroker } from '@/lib/og-client-broker';
// Dynamic imports to avoid SSR issues
// Define types locally to avoid SSR issues
type Note = {
  id: string;
  title: string;
  markdown: string;
  images: string[];
  inlineImages: any[];
  public: boolean;
  createdAt: number;
  author: `0x${string}`;
  category?: string;
  tags?: string[];
  version?: number;
  parentId?: string;
};

type INFTConversionResult = {
  inft_token_id: string;
  inft_contract_address: string;
  transaction_hash: string;
  gas_used: number;
};

type INFTIntelligence = {
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

type INFTInfo = {
  token_id: string;
  metadata: {
    name: string;
    description: string;
    image?: string;
    intelligence: INFTIntelligence;
    attributes: any[];
  };
  note_reference: {
    note_id: string;
  };
  created_at: number;
};
import LoadingSpinner from './LoadingSpinner';

const formatDate = (timestamp: number) => {
  const ts = timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp;
  return new Date(ts).toLocaleString();
};

interface INFTConverterProps {
  note: Note;
  onConversionComplete?: (result: INFTConversionResult) => void;
  onError?: (error: string) => void;
}

export default function INFTConverter({ note, onConversionComplete, onError }: INFTConverterProps) {
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [isConverting, setIsConverting] = useState(false);
  const [conversionResult, setConversionResult] = useState<INFTConversionResult | null>(null);
  const [ownedINFTs, setOwnedINFTs] = useState<INFTInfo[]>([]);
  const [showOwnedINFTs, setShowOwnedINFTs] = useState(false);
  const [selectedINFT, setSelectedINFT] = useState<INFTInfo | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [qaPairs, setQAPairs] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isAddingQA, setIsAddingQA] = useState(false);
  const [intelligenceConfig, setIntelligenceConfig] = useState<INFTIntelligence>({
    capabilities: ['summary', 'qa', 'translation'],
    model_version: '1.0.0',
    compute_requirements: {
      memory: 512,
      compute_units: 1000
    },
    data_sources: [note.id],
    prompt_template: `You are an AI assistant for analyzing the note "${note.title || note.id}". Please provide helpful summaries and answer questions about the note content.`,
    is_encrypted: false
  });
  // 0G Compute AI states
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isComputeSummarizing, setIsComputeSummarizing] = useState(false);
  const [isComputeAnswering, setIsComputeAnswering] = useState(false);

  // Ledger state
  const [ledgerBalance, setLedgerBalance] = useState<bigint | null>(null);
  const [ledgerAvailable, setLedgerAvailable] = useState<bigint | null>(null);
  const [ledgerLocked, setLedgerLocked] = useState<bigint | null>(null);
  const [isCheckingLedger, setIsCheckingLedger] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>('10');
  const [isDepositing, setIsDepositing] = useState(false);
  const [ledgerNotice, setLedgerNotice] = useState<string>('');

  // Fallback: derive answer locally from summary
  const deriveAnswerFromSummary = useCallback((question: string, summaryText: string, noteText?: string) => {
    const text = (summaryText || '').trim();
    if (!text) return '';
    const sentences = text.split(/(?<=[。！？.!?])\s+|[\r\n]+/).filter(s => s.trim().length > 0);
    const words = (question || '').toLowerCase().match(/[a-zA-Z0-9\u4e00-\u9fa5]{2,}/g) || [];
    const uniq = Array.from(new Set(words));
    const scored = sentences.map(s => {
      const lower = s.toLowerCase();
      let score = 0;
      for (const w of uniq) {
        if (lower.includes(w)) score += Math.min(3, (lower.match(new RegExp(w, 'g')) || []).length);
      }
      score += Math.min(3, Math.floor(s.length / 80));
      return { s, score };
    }).sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 3).map(x => x.s);
    if (top.length > 0) {
      return top.join('\n');
    }
    return sentences.slice(0, 2).join('\n');
  }, []);

  const handleConvertToINFT = useCallback(async () => {
    if (!isConnected || !walletClient) {
      onError?.('Please connect your wallet first');
      return;
    }

    setIsConverting(true);
    try {
      console.log('Converting note to INFT...', { noteId: note.id });
      
      const { convertNoteToINFT } = await import('@onchain-notes/sdk');
      const result = await convertNoteToINFT(
        note,
        walletClient,
        walletClient,
        intelligenceConfig
      );

      setConversionResult(result);
      onConversionComplete?.(result);
      
      console.log('INFT conversion successful:', result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to convert to INFT';
      console.error('INFT conversion failed:', error);
      onError?.(errorMessage);
    } finally {
      setIsConverting(false);
    }
  }, [note, intelligenceConfig, isConnected, walletClient, onConversionComplete, onError]);

  const handleLoadOwnedINFTs = useCallback(async () => {
    if (!isConnected || !walletClient) {
      onError?.('Please connect your wallet first');
      return;
    }

    try {
      const { getOwnedINFTs } = await import('@onchain-notes/sdk');
      const infts = await getOwnedINFTs(
        await walletClient.getAddresses().then(addrs => addrs[0]),
        walletClient
      );
      setOwnedINFTs(infts);
      setShowOwnedINFTs(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load owned INFTs';
      console.error('Failed to load owned INFTs:', error);
      onError?.(errorMessage);
    }
  }, [isConnected, walletClient, onError]);

  const updateIntelligenceConfig = useCallback((field: keyof INFTIntelligence, value: any) => {
    setIntelligenceConfig((prev: INFTIntelligence) => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const addCapability = useCallback((capability: string) => {
    if (!intelligenceConfig.capabilities.includes(capability)) {
      updateIntelligenceConfig('capabilities', [...intelligenceConfig.capabilities, capability]);
    }
  }, [intelligenceConfig.capabilities, updateIntelligenceConfig]);

  const removeCapability = useCallback((capability: string) => {
    updateIntelligenceConfig('capabilities', 
      intelligenceConfig.capabilities.filter((c: string) => c !== capability)
    );
  }, [intelligenceConfig.capabilities, updateIntelligenceConfig]);

  const handleSelectINFT = useCallback(async (inft: INFTInfo) => {
    setSelectedINFT(inft);
    try {
      // Load summary and Q&A pairs
      const { getINFTSummary, getINFTQAPairs } = await import('@onchain-notes/sdk');
      const [summaryData, qaData] = await Promise.all([
        getINFTSummary(inft.token_id, walletClient),
        getINFTQAPairs(inft.token_id, walletClient)
      ]);
      setSummary(summaryData);
      setQAPairs(qaData);
      setAiSummary(''); // reset AI summary when switching INFT
    } catch (error) {
      console.error('Error loading INFT data:', error);
      onError?.('Failed to load INFT data');
    }
  }, [walletClient, onError]);

  const handleGenerateSummary = useCallback(async () => {
    if (!selectedINFT || !walletClient) return;
    
    setIsGeneratingSummary(true);
    try {
      const { generateINFTSummary, getINFTSummary } = await import('@onchain-notes/sdk');
      await generateINFTSummary(selectedINFT.token_id, walletClient);
      // Reload summary
      const summaryData = await getINFTSummary(selectedINFT.token_id, walletClient);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error generating summary:', error);
      onError?.('Failed to generate summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [selectedINFT, walletClient, onError]);

  const handleAddQA = useCallback(async () => {
    if (!selectedINFT || !walletClient || !newQuestion.trim() || !newAnswer.trim()) return;
    
    setIsAddingQA(true);
    try {
      const { addINFTQAPair, getINFTQAPairs } = await import('@onchain-notes/sdk');
      await addINFTQAPair(selectedINFT.token_id, newQuestion, newAnswer, walletClient);
      // Reload Q&A pairs
      const qaData = await getINFTQAPairs(selectedINFT.token_id, walletClient);
      setQAPairs(qaData);
      setNewQuestion('');
      setNewAnswer('');
    } catch (error) {
      console.error('Error adding Q&A pair:', error);
      onError?.('Failed to add Q&A pair');
    } finally {
      setIsAddingQA(false);
    }
  }, [selectedINFT, walletClient, newQuestion, newAnswer, onError]);

  // Provider/account sync via server-side proxy to avoid CORS
  const handleSyncProviderAccount = useCallback(async () => {
    try {
      setLedgerNotice('');
      const DEFAULT_PROVIDER = '0x3feE5a4dd5FDb8a32dDA97Bed899830605dBD9D3';
      const addr = (process.env.NEXT_PUBLIC_OG_COMPUTE_PROVIDER_ADDRESS as string) || DEFAULT_PROVIDER;
      const { broker, endpoint, model } = await getClientService(addr);
      setLedgerNotice(`Provider synced. Endpoint: ${endpoint}`);
    } catch (err: any) {
      const msg = err?.message || String(err);
      setLedgerNotice(`Sync failed: ${msg}`);
    }
  }, []);

  // Ledger helpers
  const handleCheckLedger = useCallback(async () => {
    try {
      setIsCheckingLedger(true);
      setLedgerNotice('');
      const broker = await getClientBroker();
      // ensure ledger exists
      try {
        await broker.ledger.addLedger(0);
      } catch (e: any) {
        const msg = e?.message || String(e);
        if (/already exists/i.test(msg)) {
          // ignore
        } else {
          console.warn('创建 Ledger 失败:', msg);
        }
      }
      const account = await broker.ledger.getLedger();
      const total = account?.totalBalance ?? 0n;
      const available = account?.availableBalance ?? 0n;
      const locked = total - available;
      setLedgerBalance(total);
      setLedgerAvailable(available);
      setLedgerLocked(locked);
    } catch (err: any) {
      const msg = err?.message || String(err);
      setLedgerNotice(`检查失败: ${msg}`);
    } finally {
      setIsCheckingLedger(false);
    }
  }, []);

  const handleDeposit = useCallback(async () => {
    const amountNum = parseFloat(depositAmount || '0');
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setLedgerNotice('请输入有效的充值数额');
      return;
    }
    try {
      setIsDepositing(true);
      setLedgerNotice('');
      const broker = await getClientBroker();
      // ensure ledger exists
      try {
        await broker.ledger.addLedger(0);
      } catch (e: any) {
        const msg = e?.message || String(e);
        if (/already exists/i.test(msg)) {
          // ignore
        } else {
          console.warn('创建 Ledger 失败:', msg);
        }
      }
      await broker.ledger.depositFund(amountNum);
      setLedgerNotice(`充值成功: ${amountNum} OG`);
      await handleCheckLedger();
    } catch (err: any) {
      const msg = err?.message || String(err);
      setLedgerNotice(`充值失败: ${msg}`);
    } finally {
      setIsDepositing(false);
    }
  }, [depositAmount, handleCheckLedger]);

  // 0G Compute actions (use client helper to ensure add-account via server)
  const handleComputeSummary = useCallback(async () => {
    try {
      setIsComputeSummarizing(true);
      setAiSummary('');

      const DEFAULT_PROVIDER = '0x3feE5a4dd5FDb8a32dDA97Bed899830605dBD9D3';
      const addr = (process.env.NEXT_PUBLIC_OG_COMPUTE_PROVIDER_ADDRESS as string) || DEFAULT_PROVIDER;

      const { broker, endpoint, model } = await getClientService(addr);

      const basePrompt = intelligenceConfig.prompt_template || 'You are an AI assistant. Generate a structured summary with key points and action items.';
      const messages = [
        { role: 'user', content: `${basePrompt}\n\n${note.markdown}` }
      ];

      const headers = await broker.inference.getRequestHeaders(addr, JSON.stringify(messages));
      const res = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ model, messages })
      });

      const data = await res.json();
      if (res.ok) {
        const summaryText = data?.choices?.[0]?.message?.content || '';
        setAiSummary(summaryText);
        const chatID = data?.id;
        try {
          await broker.inference.processResponse(addr, summaryText, chatID);
        } catch {
          // non-verifiable providers may throw; continue
        }
      } else {
        onError?.(data?.error || 'Failed to generate AI summary');
      }
    } catch (err) {
      console.error('AI summary error:', err);
      onError?.('Failed to generate AI summary');
    } finally {
      setIsComputeSummarizing(false);
    }
  }, [note.markdown, intelligenceConfig.prompt_template, onError]);

  const handleComputeAnswer = useCallback(async () => {
    if (!newQuestion.trim()) return;
    try {
      setIsComputeAnswering(true);

      const DEFAULT_PROVIDER = '0x3feE5a4dd5FDb8a32dDA97Bed899830605dBD9D3';
      const addr = (process.env.NEXT_PUBLIC_OG_COMPUTE_PROVIDER_ADDRESS as string) || DEFAULT_PROVIDER;

      const { broker, endpoint, model } = await getClientService(addr);

      const messages = [
        { role: 'system', content: 'You are an intelligent assistant. Answer accurately, concisely, and with evidence based on the note content. If information is insufficient, say so.' },
        { role: 'user', content: `Note content:\n\n${note.markdown}\n\nQuestion: ${newQuestion}` }
      ];

      const headers = await broker.inference.getRequestHeaders(addr, JSON.stringify(messages));
      const res = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ model, messages })
      });

      const data = await res.json();
      if (res.ok) {
        const answerText = data?.choices?.[0]?.message?.content || '';
        setNewAnswer(answerText);
        const chatID = data?.id;
        try {
          await broker.inference.processResponse(addr, answerText, chatID);
        } catch {
          // non-verifiable providers may throw; continue
        }
      } else {
        console.warn('Compute ask failed:', data?.error);
        onError?.(data?.error || 'Failed to get AI answer');
      }
    } catch (err) {
      console.error('AI QA error:', err);
      onError?.('Failed to get AI answer');
    } finally {
      setIsComputeAnswering(false);
    }
  }, [note.markdown, newQuestion, onError]);

  if (!isConnected) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">
          Please connect your wallet to convert notes to INFTs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Conversion Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🤖 Convert to INFT (Intelligent NFT)
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Convert this note into an Intelligent NFT (INFT) based on ERC-7857 standard. 
          INFTs can perform AI-powered operations on the original note content.
        </p>

        {/* Intelligence Configuration */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Capabilities
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {intelligenceConfig.capabilities.map((capability: string, index: number) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {capability}
                  <button
                    onClick={() => removeCapability(capability)}
                    className="ml-1 hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add capability..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const value = e.currentTarget.value.trim();
                    if (value) {
                      addCapability(value);
                      e.currentTarget.value = '';
                    }
                  }
                }}
              />
              <button
                onClick={() => {
                  const input = document.querySelector('input[placeholder="Add capability..."]') as HTMLInputElement;
                  const value = input?.value.trim();
                  if (value) {
                    addCapability(value);
                    input.value = '';
                  }
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Add
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model Version
              </label>
              <input
                type="text"
                value={intelligenceConfig.model_version}
                onChange={(e) => updateIntelligenceConfig('model_version', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Memory (MB)
              </label>
              <input
                type="number"
                value={intelligenceConfig.compute_requirements.memory}
                onChange={(e) => updateIntelligenceConfig('compute_requirements', {
                  ...intelligenceConfig.compute_requirements,
                  memory: parseInt(e.target.value) || 0
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prompt Template
            </label>
            <textarea
              value={intelligenceConfig.prompt_template || ''}
              onChange={(e) => updateIntelligenceConfig('prompt_template', e.target.value)}
              placeholder="Custom prompt template for AI interactions..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              rows={3}
            />
          </div>
        </div>

        {/* Conversion Button */}
        <button
          onClick={handleConvertToINFT}
          disabled={isConverting}
          className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
            isConverting
              ? 'bg-blue-400 text-white cursor-wait'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isConverting ? 'Converting to INFT...' : 'Convert to INFT'}
        </button>

        {/* Conversion Result */}
        {conversionResult && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">✅ INFT Created Successfully!</h4>
            <div className="text-sm text-green-700 space-y-1">
              <p><strong>Token ID:</strong> {conversionResult.inft_token_id}</p>
              <p><strong>Contract:</strong> {conversionResult.inft_contract_address}</p>
              <p><strong>Transaction:</strong> 
                <a 
                  href={`https://chainscan-galileo.0g.ai/tx/${conversionResult.transaction_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-blue-600 hover:underline"
                >
                  View on Explorer
                </a>
              </p>
              <p><strong>Gas Used:</strong> {conversionResult.gas_used.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Owned INFTs Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            🎨 My INFTs
          </h3>
          <button
            onClick={handleLoadOwnedINFTs}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
          >
            {showOwnedINFTs ? 'Refresh' : 'Load INFTs'}
          </button>
        </div>

        {showOwnedINFTs && (
          <div className="space-y-3">
            {ownedINFTs.length === 0 ? (
              <p className="text-gray-500 text-sm">No INFTs found. Convert a note to create your first INFT!</p>
            ) : (
              ownedINFTs.map((inft) => (
                <div key={inft.token_id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{inft.metadata.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{inft.metadata.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {inft.metadata.intelligence.capabilities.map((capability: string, index: number) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                          >
                            {capability}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <p>Token ID: {inft.token_id}</p>
                      <p>Created: {formatDate(inft.created_at)}</p>
                      <button
                        onClick={() => handleSelectINFT(inft)}
                        className="mt-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                      >
                        {selectedINFT?.token_id === inft.token_id ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Selected INFT Intelligence Features */}
        {selectedINFT && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-4">🧠 Intelligence Features for {selectedINFT.metadata.name}</h4>

            {/* Ledger / Credits Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-gray-900">Compute Credits (0G Ledger)</h5>
                <div className="flex gap-2">
                  <button
                    onClick={handleSyncProviderAccount}
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                  >
                    Sync Provider
                  </button>
                  <button
                    onClick={handleCheckLedger}
                    disabled={isCheckingLedger}
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 disabled:bg-gray-200"
                  >
                    {isCheckingLedger ? 'Checking...' : 'Check Balance'}
                  </button>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded p-3">
                <div className="text-xs text-gray-700 grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <span className="font-medium">Total:</span>
                    <span className="ml-1">{ledgerBalance !== null ? `${ethers.formatEther(ledgerBalance)} OG` : '-'}</span>
                  </div>
                  <div>
                    <span className="font-medium">Available:</span>
                    <span className="ml-1">{ledgerAvailable !== null ? `${ethers.formatEther(ledgerAvailable)} OG` : '-'}</span>
                  </div>
                  <div>
                    <span className="font-medium">Locked:</span>
                    <span className="ml-1">{ledgerLocked !== null ? `${ethers.formatEther(ledgerLocked)} OG` : '-'}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={0.001}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-xs w-28"
                  />
                  <button
                    onClick={handleDeposit}
                    disabled={isDepositing}
                    className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:bg-green-400"
                  >
                    {isDepositing ? 'Depositing...' : 'Recharge'}
                  </button>
                  {ledgerNotice && (
                    <span className="text-xs text-gray-600 ml-2">{ledgerNotice}</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Summary Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-gray-900">Summary</h5>
                <button
                  onClick={handleGenerateSummary}
                  disabled={isGeneratingSummary}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {isGeneratingSummary ? 'Generating...' : 'Generate Summary'}
                </button>
              </div>
              <div className="bg-white border border-gray-200 rounded p-3 min-h-[100px]">
                {summary ? (
                  <p className="text-sm text-gray-700">{summary}</p>
                ) : (
                  <p className="text-sm text-gray-500 italic">No summary available. Click &quot;Generate Summary&quot; to create one.</p>
                )}
              </div>
              {/* 0G Compute Summary */}
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <h6 className="text-sm font-medium text-gray-900">0G AI Summary (Off-chain, Verifiable)</h6>
                  <button
                    onClick={handleComputeSummary}
                    disabled={isComputeSummarizing}
                    className="px-2 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 disabled:bg-indigo-400"
                  >
                    {isComputeSummarizing ? 'Generating...' : 'Generate with 0G AI'}
                  </button>
                </div>
                <div className="bg-white border border-gray-200 rounded p-3 min-h-[80px]">
                  {aiSummary ? (
                    <p className="text-sm text-gray-700">{aiSummary}</p>
                  ) : (
                    <p className="text-xs text-gray-500 italic">Click the button above to generate an off-chain AI summary.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Q&A Section */}
            <div className="mb-6">
              <h5 className="font-medium text-gray-900 mb-2">Q&A Pairs</h5>
              
              {/* Add new Q&A */}
              <div className="mb-4 p-3 bg-white border border-gray-200 rounded">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Question..."
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Answer..."
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleComputeAnswer}
                    disabled={isComputeAnswering || !newQuestion.trim()}
                    className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:bg-indigo-400"
                  >
                    {isComputeAnswering ? 'Answering...' : 'Answer with 0G AI'}
                  </button>
                  <button
                    onClick={handleAddQA}
                    disabled={isAddingQA || !newQuestion.trim() || !newAnswer.trim()}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:bg-green-400"
                  >
                    {isAddingQA ? 'Adding...' : 'Write Q&A on-chain'}
                  </button>
                </div>
              </div>

              {/* Display Q&A pairs */}
              <div className="space-y-2">
                {qaPairs.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No Q&A pairs available. Add some above!</p>
                ) : (
                  qaPairs.map((qa, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded p-3">
                      {index % 2 === 0 ? (
                        <p className="text-sm font-medium text-blue-700">Q: {qa}</p>
                      ) : (
                        <p className="text-sm text-gray-700 ml-4">A: {qa}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {isConverting && (
        <LoadingSpinner 
          message="Converting note to INFT..." 
          showProgress={true}
        />
      )}
    </div>
  );
}
