import { getDefaultConfig } from '@rainbow-me/rainbowkit';

// 0G Mainnet configuration
const ogMainnet = {
  id: 16661,
  name: '0G-Mainnet',
  network: '0g-mainnet',
  nativeCurrency: {
    decimals: 18,
    name: '0G',
    symbol: '0G',
  },
  rpcUrls: {
    public: { http: ['https://evmrpc.0g.ai/'] },
    default: { http: ['https://evmrpc.0g.ai/'] },
  },
  blockExplorers: {
    default: { name: 'Chainscan', url: 'https://chainscan.0g.ai' },
  },
  testnet: false,
};

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '';

export const config = getDefaultConfig({
  appName: 'Note3',
  projectId,
  chains: [ogMainnet] as any, // Use 0G mainnet
  ssr: false, // Disable SSR to avoid browser API issues
});
