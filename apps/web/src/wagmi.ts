import { getDefaultConfig } from '@rainbow-me/rainbowkit';

// 0G Galileo testnet configuration - Only available network
// per 0G SDK docs: Testnet Overview - Network Details
const ogGalileoTestnet = {
  id: 16602,
  name: '0G-Galileo-Testnet',
  network: '0g-galileo-testnet',
  nativeCurrency: {
    decimals: 18,
    name: '0G',
    symbol: '0G',
  },
  rpcUrls: {
    public: { http: ['https://evmrpc-testnet.0g.ai/'] },
    default: { http: ['https://evmrpc-testnet.0g.ai/'] },
  },
  blockExplorers: {
    default: { name: 'Chainscan', url: 'https://chainscan-galileo.0g.ai' },
  },
  testnet: true,
};

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '';

export const config = getDefaultConfig({
  appName: 'Note3',
  projectId,
  chains: [ogGalileoTestnet] as any, // Only keep 0G testnet
  ssr: false, // Disable SSR to avoid browser API issues
});
