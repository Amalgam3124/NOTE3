'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import Link from 'next/link';
import LoadingSpinner from '../../../src/components/LoadingSpinner';
import { ethers } from 'ethers';

// Light types to avoid SSR issues
type INFTInfo = {
  token_id: string;
  contract_address: `0x${string}`;
  owner: `0x${string}`;
  created_at: number;
  note_reference: {
    note_id: string;
    note_cid?: string;
  };
  metadata: {
    name: string;
    description: string;
    image?: string;
    attributes: any[];
    intelligence: {
      capabilities: string[];
      model_version: string;
      compute_requirements: { memory: number; compute_units: number };
      data_sources: string[];
      prompt_template?: string;
    };
  };
};

const formatDate = (timestamp: number) => {
  const ts = timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp;
  return new Date(ts).toLocaleString();
};

export default function INFTInteractionPage({ params }: { params: { tokenId: string } }) {
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [inft, setINFT] = useState<INFTInfo | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [qaPairs, setQAPairs] = useState<string[]>([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState('');
  const tokenId = params.tokenId;

  // Avoid SSR hydration mismatch by rendering after client mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const rpcProvider = new ethers.JsonRpcProvider('https://evmrpc-testnet.0g.ai/');

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const {
        getINFTInfo,
        getINFTSummary,
        getINFTQAPairs,
      } = await import('@onchain-notes/sdk');

      const info = await getINFTInfo(tokenId, rpcProvider);
      if (info) setINFT(info as INFTInfo);

      const s = await getINFTSummary(tokenId, rpcProvider);
      setSummary(s || '');

      const qas = await getINFTQAPairs(tokenId, rpcProvider);
      setQAPairs(Array.isArray(qas) ? qas : []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load INFT';
      setError(msg);
      console.error('INFT load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tokenId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function getSignerEnsured() {
    if (typeof window === 'undefined') throw new Error('Browser environment required');
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    // Ensure chain 16602
    try {
      const network = await provider.getNetwork();
      const cid = Number(network.chainId);
      if (cid !== 16602) {
        try {
          await (window as any).ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x40da' }],
          });
        } catch (switchErr: any) {
          // Try to add chain then switch
          try {
            await (window as any).ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x40da',
                chainName: '0G Galileo Testnet',
                nativeCurrency: { name: 'OG', symbol: 'OG', decimals: 18 },
                rpcUrls: ['https://evmrpc-testnet.0g.ai/'],
                blockExplorerUrls: ['https://chainscan-galileo.0g.ai/'],
              }],
            });
            await (window as any).ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x40da' }],
            });
          } catch (addErr) {
            console.warn('Failed to add/switch chain:', addErr);
            throw new Error('Please switch to 0G Galileo Testnet (16602).');
          }
        }
      }
    } catch (err) {
      console.warn('Network check failed:', err);
    }

    const signer = await provider.getSigner();
    const addr = await signer.getAddress();
    const bal = await provider.getBalance(addr);
    const min = ethers.parseEther('0.001');
    if (bal < min) {
      throw new Error('Insufficient balance: need at least 0.001 OG. Get test tokens from https://faucet.0g.ai/.');
    }
    return signer;
  }

  const handleGenerateSummary = useCallback(async () => {
    // Owner pre-check: only the INFT owner can generate summary
    if (address && inft && inft.owner && inft.owner.toLowerCase() !== address.toLowerCase()) {
      setError('Connected wallet is not the owner of this INFT; cannot generate summary.');
      return;
    }

    setIsWorking(true);
    setError('');
    try {
      const { generateINFTSummary, getINFTSummary } = await import('@onchain-notes/sdk');
      const signer = await getSignerEnsured();
      await generateINFTSummary(tokenId, signer);
      const s = await getINFTSummary(tokenId, rpcProvider);
      setSummary(s || '');
    } catch (err) {
      const raw = (err as any)?.message || String(err);
      let hint = '';
      if (/Not owner/i.test(raw)) {
        hint = 'Please use the wallet that owns this INFT.';
      } else if (/Token does not exist/i.test(raw)) {
        hint = 'Token ID does not exist. Verify the tokenId.';
      } else if (/insufficient funds/i.test(raw)) {
        hint = 'Insufficient OG balance. Visit https://faucet.0g.ai/ for test tokens.';
      } else if (/-32603/.test(raw) || /Transaction failed/i.test(raw)) {
        hint = 'Transaction reverted. Ensure you are the owner, on chain 16602, and funded.';
      }
      setError(hint ? `${raw} — ${hint}` : raw);
      console.error('Generate summary failed:', err);
    } finally {
      setIsWorking(false);
    }
  }, [tokenId, address, inft, rpcProvider]);

  const handleAddQAPair = useCallback(async () => {
    if (!question.trim() || !answer.trim()) {
      setError('Please enter both question and answer');
      return;
    }
    setIsWorking(true);
    setError('');
    try {
      const { addINFTQAPair, getINFTQAPairs } = await import('@onchain-notes/sdk');
      const signer = await getSignerEnsured();
      await addINFTQAPair(tokenId, question.trim(), answer.trim(), signer);
      const qas = await getINFTQAPairs(tokenId, rpcProvider);
      setQAPairs(Array.isArray(qas) ? qas : []);
      setQuestion('');
      setAnswer('');
    } catch (err) {
      const raw = (err as any)?.message || String(err);
      let hint = '';
      if (/Not owner/i.test(raw)) {
        hint = 'Caller is not the owner of this INFT token.';
      } else if (/Token does not exist/i.test(raw)) {
        hint = 'Token ID does not exist on the contract.';
      } else if (/insufficient funds/i.test(raw)) {
        hint = 'Insufficient OG balance. Please fund your wallet (>= 0.001 OG).';
      } else if (/-32603/.test(raw) || /Transaction failed/i.test(raw)) {
        hint = 'Transaction reverted on 0G Galileo Testnet (chainId 16602).';
      }
      setError(hint ? `${raw} — ${hint}` : raw);
      console.error('Add QA failed:', err);
    } finally {
      setIsWorking(false);
    }
  }, [tokenId, question, answer]);

  // Optional: ask AI to auto-generate an answer based on original note content
  const handleAskAI = useCallback(async () => {
    if (!inft?.note_reference?.note_id) {
      setError('Original Note ID not found');
      return;
    }
    setIsWorking(true);
    try {
      const { findById } = await import('../../../src/lib/note');
      const { getNote } = await import('../../../src/lib/0g-storage');
      const { getClientService, getDefaultProviderAddress } = await import('../../../src/lib/og-client-broker');

      const idx = findById(inft.note_reference.note_id);
      if (!idx?.cid) {
        setError('Local index missing original Note CID; AI chat unavailable.');
        return;
      }
      const note = await getNote(idx.cid, walletClient);
      const content = note?.markdown || '';

      const addr = getDefaultProviderAddress();
      const { broker, endpoint, model } = await getClientService(addr);

      const messages = [
        { role: 'system', content: 'You are an intelligent assistant. Answer accurately, concisely, and with evidence based on the note content. If information is insufficient, say so.' },
        { role: 'user', content: `Note content:\n\n${content}\n\nQuestion: ${question}` },
      ];

      const headers = await broker.inference.getRequestHeaders(addr, JSON.stringify(messages));

      const res = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ model, messages }),
      });

      const raw = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(raw);
      } catch {
        setError(`Service error (${res.status}): ${raw.slice(0, 200)}`);
        return;
      }

      if (!res.ok) {
        setError(data?.error || `Service error (${res.status})`);
        return;
      }

      const nextAnswer = data?.choices?.[0]?.message?.content || '';
      const chatID = data?.id;

      try {
        const isValid = await broker.inference.processResponse(addr, nextAnswer, chatID);
        if (!isValid) {
          console.warn('Response unverifiable or invalid.');
        }
      } catch (e) {
        // Non-verifiable services may throw or return false; it's okay
      }

      if (nextAnswer) {
        setAnswer(nextAnswer);
      } else {
        setError('AI service is unavailable');
      }
    } catch (err) {
      const raw = (err as any)?.message || String(err);
      setError(raw);
    } finally {
      setIsWorking(false);
    }
  }, [inft, question, walletClient]);

  // Gate rendering until client mounted to avoid SSR/client divergence
  if (!mounted) {
    return (
      <div className="flex justify-center py-12"><LoadingSpinner message="Loading INFT..." /></div>
    );
  }

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">INFT Interaction</h1>
          <Link href="/infts" className="px-3 py-2 bg-gray-100 rounded-lg">Back to list</Link>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800">Please connect your wallet to interact with INFT.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">INFT Interaction</h1>
        <Link href="/infts" className="px-3 py-2 bg-gray-100 rounded-lg">Back to list</Link>
      </div>

      {/* Owner mismatch banner */}
      {address && inft && inft.owner && inft.owner.toLowerCase() !== address.toLowerCase() && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-yellow-800 text-sm">Connected wallet is not the owner of this INFT; on-chain actions will be rejected.</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner message="Loading INFT..." /></div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4"><p className="text-red-800">{error}</p></div>
      ) : inft ? (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left: INFT Info */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">{inft.metadata.name}</h3>
            <p className="text-sm text-gray-600 mb-4">{inft.metadata.description}</p>
            {inft.metadata.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={inft.metadata.image} alt={inft.metadata.name} className="w-full h-40 object-cover rounded-lg border" />
            )}
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div><span className="font-medium">Token ID:</span><br />{inft.token_id}</div>
              <div><span className="font-medium">Created At:</span><br />{formatDate(inft.created_at)}</div>
              <div><span className="font-medium">Model Version:</span><br />v{inft.metadata.intelligence.model_version}</div>
              <div><span className="font-medium">Owner:</span><br />{inft.owner}</div>
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-700">Original Note: {inft.note_reference.note_id}</p>
              <Link href={`/note/${inft.note_reference.note_id}`} className="text-xs text-blue-600 hover:underline">View Original Note →</Link>
            </div>
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">AI Capabilities</h4>
              <div className="flex flex-wrap gap-1">
                 {inft.metadata.intelligence.capabilities.length === 0 ? (
                   <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">none</span>
                 ) : (
                   inft.metadata.intelligence.capabilities.map((c, i) => (
                     <span key={i} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">{c}</span>
                   ))
                 )}
               </div>
             </div>
           </div>

           {/* Right: Interaction */}
           <div className="bg-white border border-gray-200 rounded-lg p-6">
             <h3 className="text-lg font-semibold text-gray-900 mb-4">🧠 Intelligence</h3>

             {/* Summary */}
             <div className="mb-6">
               <div className="flex items-center justify-between mb-2">
                 <h4 className="text-sm font-medium text-gray-700">Summary</h4>
                 <button onClick={handleGenerateSummary} disabled={isWorking || (address && inft && inft.owner && inft.owner.toLowerCase() !== address.toLowerCase())} className={`px-3 py-1 rounded text-xs ${isWorking ? 'bg-blue-400 text-white cursor-wait' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>Generate Summary</button>
               </div>
               {summary ? (
                 <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm whitespace-pre-wrap">{summary}</div>
               ) : (
                 <p className="text-xs text-gray-500">No summary generated yet</p>
               )}
             </div>

             {/* Q&A */}
             <div>
               <h4 className="text-sm font-medium text-gray-700 mb-2">Q&A</h4>
               <div className="space-y-2 mb-3">
                 <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Enter your question..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                 <div className="flex gap-2">
                   <button onClick={handleAskAI} disabled={!question.trim() || isWorking} className={`px-3 py-1 rounded text-xs ${isWorking ? 'bg-purple-400 text-white cursor-wait' : 'bg-purple-600 text-white hover:bg-purple-700'}`}>Ask AI</button>
                   <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Provide an answer (or use AI output)" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                   <button onClick={handleAddQAPair} disabled={!question.trim() || !answer.trim() || isWorking || (address && inft && inft.owner && inft.owner.toLowerCase() !== address.toLowerCase())} className={`px-3 py-1 rounded text-xs ${isWorking ? 'bg-green-400 text-white cursor-wait' : 'bg-green-600 text-white hover:bg-green-700'}`}>Save On-chain</button>
                 </div>
               </div>
               <div className="space-y-2">
                 {qaPairs.length === 0 ? (
                   <p className="text-xs text-gray-500 italic">No Q&A records</p>
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
         </div>
       ) : (
         <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"><p className="text-yellow-800">INFT not found</p></div>
       )}

       {isWorking && (
         <LoadingSpinner message="Executing on-chain interaction..." />
       )}
    </div>
  );
}