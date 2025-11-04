'use client';

import { ethers } from 'ethers';
import { createZGComputeNetworkBroker } from '@0glabs/0g-serving-broker';

const DEFAULT_PROVIDER_ADDRESS = process.env.NEXT_PUBLIC_OG_COMPUTE_PROVIDER_ADDRESS || '0x3feE5a4dd5FDb8a32dDA97Bed899830605dBD9D3';

async function ensureWalletReady() {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('Please install MetaMask');
  }
  const provider = new ethers.BrowserProvider((window as any).ethereum);

  try {
    await provider.send('eth_requestAccounts', []);
  } catch {}

  try {
    const network = await provider.getNetwork();
    const cid = Number(network.chainId);
    if (cid !== 16661) {
      try {
        await (window as any).ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x4115' }] });
      } catch {
        await (window as any).ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x4115',
            chainName: '0G Mainnet',
            nativeCurrency: { name: '0G', symbol: '0G', decimals: 18 },
            rpcUrls: ['https://evmrpc.0g.ai/'],
            blockExplorerUrls: ['https://chainscan.0g.ai/'],
          }],
        });
        await (window as any).ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x4115' }] });
      }
    }
  } catch {}

  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const bal = await provider.getBalance(address);
  const min = ethers.parseEther('0.001');
  if (bal < min) {
    throw new Error('Insufficient 0G balance on Mainnet (>= 0.001 0G required).');
  }

  return { provider, signer, address };
}

export async function getClientBroker() {
  const { signer } = await ensureWalletReady();
  const broker = await createZGComputeNetworkBroker(signer);
  // Ensure the user ledger exists (creates if missing)
  try {
    await broker.ledger.addLedger(0);
    console.debug('[OG Broker] Ledger created with 0 A0GI');
  } catch (e: any) {
    const msg = e?.message || String(e);
    if (/Ledger already exists/i.test(msg)) {
      console.debug('[OG Broker] Ledger already exists');
    } else {
      console.warn('[OG Broker] Ledger creation failed:', msg);
    }
  }
  return broker;
}

export async function getClientService(providerAddress?: string) {
  const { signer, address } = await ensureWalletReady();
  const broker = await createZGComputeNetworkBroker(signer);
  // Ensure the user ledger exists (creates if missing)
  try {
    await broker.ledger.addLedger(0);
    console.debug('[OG Broker] Ledger created with 0 A0GI');
  } catch (e: any) {
    const msg = e?.message || String(e);
    if (/Ledger already exists/i.test(msg)) {
      console.debug('[OG Broker] Ledger already exists');
    } else {
      console.warn('[OG Broker] Ledger creation failed:', msg);
    }
  }
  const addr = providerAddress || DEFAULT_PROVIDER_ADDRESS;

  // Fetch service metadata to get endpoint for add-account
  const meta = await broker.inference.getServiceMetadata(addr);
  console.debug('[OG Broker] Service metadata:', meta);

  // Prepare payload for account creation
  const payload = { address, provider: addr };

  // Build candidate endpoints (client-side plain POST only)
  let base = String(meta.endpoint || '').replace(/\/+$/, '');
  const candidates: string[] = [];
  const pushUnique = (u: string) => { if (u && !candidates.includes(u)) candidates.push(u); };

  // Direct base
  pushUnique(`${base}/add-account`);

  // Variant: remove '/proxy'
  if (base.includes('/proxy')) {
    pushUnique(`${base.replace('/proxy', '')}/add-account`);
  }
  // Variant: '/v1/proxy' -> '/v1'
  if (base.includes('/v1/proxy')) {
    pushUnique(`${base.replace('/v1/proxy', '/v1')}/add-account`);
  }
  // Variant: if ends with '/v1', also try without it
  if (base.endsWith('/v1')) {
    pushUnique(`${base.replace(/\/v1$/, '')}/add-account`);
  }

  // Origin-level variants
  try {
    const origin = new URL(base).origin;
    pushUnique(`${origin}/add-account`);
    pushUnique(`${origin}/v1/add-account`);
  } catch {}

  console.debug('[OG Broker] add-account candidates:', candidates);

  // Try server-side fallback API FIRST to avoid browser CORS issues
  let created = false;
  try {
    const resp = await fetch('/api/og/add-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    if (resp.ok && data?.ok) {
      created = true;
      console.debug('[OG Broker] server add-account success:', data);
    } else {
      console.warn('[OG Broker] server add-account failed:', data);
    }
  } catch (e) {
    console.warn('[OG Broker] server add-account error:', (e as any)?.message || e);
  }

  // If still not created, try each endpoint until success (may hit CORS)
  let lastText = '';
  if (!created) {
    for (const url of candidates) {
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const text = await resp.text();
        lastText = text;
        if (resp.ok || /already exists/i.test(text)) {
          created = true;
          console.debug('[OG Broker] add-account success via', url, text);
          break;
        } else {
          console.warn('[OG Broker] add-account failed via', url, text);
        }
      } catch (e) {
        console.warn('[OG Broker] add-account error via', url, (e as any)?.message || e);
      }
    }
  }

  // Force a wallet authorization popup by asking for a signature
  try {
    const sig = await (await ensureWalletReady()).signer.signMessage(`Authorize Note3 to use provider ${addr} at ${new Date().toISOString()}`);
    console.debug('[OG Broker] signature obtained:', sig.slice(0, 14) + '...');
  } catch (e) {
    console.warn('[OG Broker] signature step failed or dismissed:', (e as any)?.message || e);
  }

  // Acknowledge provider on-chain (should trigger wallet popup if a tx is required)
  try {
    await broker.inference.acknowledgeProviderSigner(addr);
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.warn('acknowledgeProviderSigner warning:', msg);
    // Do not throw here; allow summary/ask flows to proceed without fatal error
  }

  return { broker, endpoint: meta.endpoint, model: meta.model, providerAddress: addr, address };
}

export function getDefaultProviderAddress() {
  return DEFAULT_PROVIDER_ADDRESS;
}