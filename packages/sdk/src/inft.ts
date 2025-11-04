import { ethers } from 'ethers';
import { 
  INFTMetadata, 
  INFTConversionRequest, 
  INFTConversionResult, 
  INFTInfo,
  INFTIntelligence,
  Note 
} from '@onchain-notes/types';


// Note3 ERC-7857 INFT Contract ABI
const NOTE3_INFT_ABI = [
  // ERC-7857 functions
  'function mint(bytes[] calldata proofs, string[] calldata dataDescriptions, address to) external payable returns (uint256)',
  'function mintNote3INFT(bytes[] calldata proofs, string[] calldata dataDescriptions, string memory noteId, address to, tuple(string[] capabilities, string modelVersion, uint256 memoryRequirement, uint256 computeUnits, string[] dataSources, string promptTemplate, bool isEncrypted) intelligenceConfig) external payable returns (uint256)',
  'function transfer(address to, uint256 tokenId, bytes[] calldata proofs) external',
  'function clone(address to, uint256 tokenId, bytes[] calldata proofs) external returns (uint256)',
  'function authorizeUsage(uint256 tokenId, address to) external',
  'function update(uint256 tokenId, bytes[] calldata proofs) external',
  
  // Note3 specific functions
  'function getNoteId(uint256 tokenId) external view returns (string memory)',
  'function getTokenName(uint256 tokenId) external view returns (string memory)',
  'function dataHashesOf(uint256 tokenId) external view returns (bytes32[] memory)',
  'function dataDescriptionsOf(uint256 tokenId) external view returns (string[] memory)',
  
  // Intelligence functions
  'function generateSummary(uint256 tokenId) external',
  'function addQAPair(uint256 tokenId, string memory question, string memory answer) external',
  'function getSummary(uint256 tokenId) external view returns (string memory)',
  'function getQAPairs(uint256 tokenId) external view returns (string[] memory)',
  'function getIntelligenceConfig(uint256 tokenId) external view returns (tuple(string[] capabilities, string modelVersion, uint256 memoryRequirement, uint256 computeUnits, string[] dataSources, string promptTemplate, bool isEncrypted))',
  
  // Standard ERC-721 functions
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function balanceOf(address owner) external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function supportsInterface(bytes4 interfaceId) external view returns (bool)',
  
  // ERC-7857 compliance functions
  'function isERC7857Compliant() external view returns (bool)',
  'function getERC7857InterfaceId() external view returns (bytes4)',
  'function getContractStandard() external view returns (string)',
  'function getContractType() external view returns (string)',
  'function implementsERC7857() external view returns (bool)',
  
  // Events
  'event Minted(uint256 indexed tokenId, address indexed creator, address indexed owner, bytes32[] dataHashes, string[] dataDescriptions)',
  'event Authorization(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event Transferred(uint256 tokenId, address indexed from, address indexed to)',
  'event Cloned(uint256 indexed tokenId, uint256 indexed newTokenId, address from, address to)',
  'event PublishedSealedKey(address indexed to, uint256 indexed tokenId, bytes16[] sealedKeys)',
  'event Updated(uint256 indexed tokenId, bytes32[] oldDataHashes, bytes32[] newDataHashes)'
];

// Contract address (will be updated post-deployment)
const INFT_CONTRACT_ADDRESS = '0x9828a3eE2c401FCCD0716b446a3062fFF14b98fD';
const OG_RPC_URL = process.env.NEXT_PUBLIC_OG_ENDPOINT || 'https://evmrpc.0g.ai/';

// Ensure the contract address is valid
if (!INFT_CONTRACT_ADDRESS || !INFT_CONTRACT_ADDRESS.startsWith('0x')) {
  throw new Error('Invalid INFT contract address. Please set NEXT_PUBLIC_INFT_CONTRACT_ADDRESS environment variable.');
}

// Convert wallet client to ethers signer (browser)
async function toEthersSigner(signer: any): Promise<ethers.Signer> {
  // Already an ethers Signer
  if (signer && typeof signer.getAddress === 'function' && typeof signer.signTransaction === 'function') {
    return signer as ethers.Signer;
  }

  // Use BrowserProvider from window.ethereum for wagmi/viem wallet clients
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    const provider = new ethers.BrowserProvider((window as any).ethereum);

    // Try to switch to 0G Mainnet if needed
    try {
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== 16661) {
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x4115' }],
        });
      }
    } catch (e) {
      console.warn('INFT: Network switch warning:', (e as any)?.message || e);
    }

    // Get target address from wallet client if available
    let addr: string | undefined;
    try {
      if (signer && typeof signer.getAddresses === 'function') {
        const addrs = await signer.getAddresses();
        addr = addrs?.[0];
      }
    } catch {}

    // Resolve signer
    const ethersSigner = addr ? await provider.getSigner(addr) : await provider.getSigner();
    return ethersSigner;
  }

  throw new Error('No browser wallet provider found. Please open in a browser with MetaMask.');
}

// Ensure network and minimal balance for 0G transactions
async function ensureOGNetworkAndFunds(address: `0x${string}`) {
  const provider = new ethers.JsonRpcProvider(OG_RPC_URL);
  const balance = await provider.getBalance(address);
  const minBalanceWei = 1_000_000_000_000_000n; // 0.001 OG
  if (balance < minBalanceWei) {
    throw new Error('Insufficient 0G balance (>= 0.001 OG required) on mainnet.');
  }
}

/**
 * Convert a note to INFT with intelligence capabilities
 */
export async function convertNoteToINFT(
  note: Note,
  signer: any,
  providerOrConfig?: any,
  maybeConfig?: Partial<INFTIntelligence>
): Promise<INFTConversionResult> {
  try {
    const ethersSigner = await toEthersSigner(signer);
    const signerAddress = await ethersSigner.getAddress();
    await ensureOGNetworkAndFunds(signerAddress as `0x${string}`);

    const contract = new ethers.Contract(INFT_CONTRACT_ADDRESS, NOTE3_INFT_ABI, ethersSigner);
    
    // Generate proofs - verifier expects 32-byte data hashes
    // For Note3Verifier, the proof is the data hash itself (32 bytes)
    const contentHash = ethers.keccak256(ethers.toUtf8Bytes(note.id + '-content'));
    const metadataHash = ethers.keccak256(ethers.toUtf8Bytes(note.id + '-metadata'));
    
    const proofs = [
      ethers.getBytes(contentHash),
      ethers.getBytes(metadataHash)
    ];
    
    const dataDescriptions = [
      'Note content',
      'Note metadata'
    ];
    
    const defaultIntelligenceConfig = {
      capabilities: ['summary', 'qa', 'translation'],
      modelVersion: '1.0.0',
      memoryRequirement: 512,
      computeUnits: 1000,
      dataSources: [note.id],
      promptTemplate: `You are an AI assistant for analyzing the note ${note.title || note.id}. Provide helpful summaries and answer questions about its content.`,
      isEncrypted: false
    };

    // Determine user-provided intelligence config from flexible args
    let userConfig: Partial<INFTIntelligence> | undefined;
    if (maybeConfig) {
      userConfig = maybeConfig;
    } else if (providerOrConfig && typeof providerOrConfig === 'object') {
      const c: any = providerOrConfig;
      if (Array.isArray(c?.capabilities) || 'modelVersion' in c || 'model_version' in c) {
        userConfig = c;
      }
    }
    
    const finalConfig = { ...defaultIntelligenceConfig, ...(userConfig || {}) };
    
    const gasLimit = 500000n;
    console.log('Attempting Note3 INFT mint with noteId:', note.id, 'and gas limit:', gasLimit.toString());

    const mintTx = await contract.mintNote3INFT(
      proofs,
      dataDescriptions,
      note.id,
      signerAddress,
      finalConfig,
      { gasLimit }
    );
    
    let receipt;
    try {
      receipt = await mintTx.wait();
      console.log('Note3 INFT mint successful, receipt:', receipt);
    } catch (error) {
      console.warn('tx.wait() failed, using transaction hash only:', (error as any)?.message || error);
      receipt = { hash: (mintTx as any)?.hash, logs: [] } as any;
    }
    
    let tokenId = 1;
    try {
      const mintEvent = (receipt as any)?.logs?.find((log: any) => {
        try { return contract.interface.parseLog(log)?.name === 'Minted'; } catch { return false; }
      });
      if (mintEvent) {
        const parsed = contract.interface.parseLog(mintEvent);
        tokenId = parsed?.args?.tokenId?.toString() || 1;
        console.log('Extracted token ID from mint event:', tokenId);
      }
    } catch (error) {
      console.warn('Failed to extract token ID from mint event:', (error as any)?.message || error);
    }
    
    const transactionHash = (mintTx as any)?.hash || (receipt as any)?.hash || 'unknown';
    
    return {
      inft_token_id: tokenId.toString(),
      inft_contract_address: INFT_CONTRACT_ADDRESS as `0x${string}`,
      metadata_uri: '',
      transaction_hash: transactionHash as `0x${string}`,
      gas_used: (receipt as any)?.gasUsed || 0,
      conversion_timestamp: Math.floor(Date.now() / 1000)
    };
  } catch (error) {
    const raw = (error as any)?.message || String(error);
    let hint = '';
    if (/Transaction failed/i.test(raw) || /-32603/.test(raw)) {
      hint = 'Transaction reverted. Ensure chain is 16602 and you have >= 0.001 OG.';
    } else if (/insufficient funds/i.test(raw)) {
      hint = 'Insufficient funds. Get test tokens at https://faucet.0g.ai/';
    }
    console.error('Error converting note to INFT:', raw, hint || '');
    throw new Error(hint ? `${raw} — ${hint}` : raw);
  }
}

/**
 * Get INFT information
 */
export async function getINFTInfo(
  tokenId: string,
  provider: any
): Promise<INFTInfo | null> {
  try {
    const contract = new ethers.Contract(INFT_CONTRACT_ADDRESS, NOTE3_INFT_ABI, provider);
    const owner = await contract.ownerOf(tokenId);

    let tokenURI = '';
    let noteId = tokenId;
    let tokenName = `note3-${tokenId}`;
    let dataHashes: string[] = [];
    let dataDescriptions: string[] = [];

    try {
      tokenURI = await contract.tokenURI(tokenId);
    } catch (error) {
      console.warn('Failed to get tokenURI:', error);
    }

    try { noteId = await contract.getNoteId(tokenId); } catch (error) { console.warn('Failed to get noteId:', error); }
    try { tokenName = await contract.getTokenName(tokenId); } catch (error) { console.warn('Failed to get tokenName:', error); }
    try { dataHashes = await contract.dataHashesOf(tokenId); } catch (error) { console.warn('Failed to get dataHashes:', error); }
    try { dataDescriptions = await contract.dataDescriptionsOf(tokenId); } catch (error) { console.warn('Failed to get dataDescriptions:', error); }

    // Defaults
    let intelligence = {
      capabilities: [] as string[],
      model_version: '1.0.0',
      compute_requirements: { memory: 0, compute_units: 0 },
      data_sources: [] as string[],
      prompt_template: ''
    };
    let image = '';
    let description = 'Note converted to INFT';
    let createdAt = Math.floor(Date.now() / 1000);
    let attributes: any[] = [
      { trait_type: 'Type', value: 'Note' },
      { trait_type: 'Note ID', value: noteId },
      { trait_type: 'Data Hashes', value: dataHashes.length.toString() }
    ];

    // Prefer parsing tokenURI if present
    if (tokenURI && tokenURI.trim().startsWith('{')) {
      try {
        const meta = JSON.parse(tokenURI);
        if (meta?.intelligence) {
          intelligence = {
            capabilities: Array.isArray(meta.intelligence.capabilities) ? meta.intelligence.capabilities : [],
            model_version: String(meta.intelligence.model_version || meta.intelligence.modelVersion || '1.0.0'),
            compute_requirements: {
              memory: Number(meta.intelligence.compute_requirements?.memory || meta.intelligence.memoryRequirement || 0),
              compute_units: Number(meta.intelligence.compute_requirements?.compute_units || meta.intelligence.computeUnits || 0)
            },
            data_sources: Array.isArray(meta.intelligence.data_sources) ? meta.intelligence.data_sources : (Array.isArray(meta.intelligence.dataSources) ? meta.intelligence.dataSources : []),
            prompt_template: String(meta.intelligence.prompt_template || meta.intelligence.promptTemplate || '')
          };
        }
        if (typeof meta?.image === 'string') image = meta.image;
        if (typeof meta?.description === 'string') description = meta.description;
        if (Array.isArray(meta?.attributes)) attributes = meta.attributes;
        if (typeof meta?.created_at === 'number') createdAt = meta.created_at;
        if (typeof meta?.name === 'string') tokenName = meta.name;
      } catch (e) {
        console.warn('Failed to parse tokenURI JSON, will fallback to getIntelligenceConfig:', e);
      }
    }

    // Fallback: fetch intelligence config directly
    if (intelligence.capabilities.length === 0) {
      try {
        const cfg = await contract.getIntelligenceConfig(tokenId);
        intelligence = {
          capabilities: Array.isArray((cfg as any)?.capabilities) ? (cfg as any).capabilities : [],
          model_version: String((cfg as any)?.modelVersion || '1.0.0'),
          compute_requirements: {
            memory: Number((cfg as any)?.memoryRequirement || 0),
            compute_units: Number((cfg as any)?.computeUnits || 0)
          },
          data_sources: Array.isArray((cfg as any)?.dataSources) ? (cfg as any).dataSources : [],
          prompt_template: String((cfg as any)?.promptTemplate || '')
        };
      } catch (e) {
        console.warn('Failed to get intelligence config:', e);
      }
    }

    // Final UI fallback: if still empty, show default capabilities for better UX
    if (intelligence.capabilities.length === 0) {
      intelligence.capabilities = ['summary', 'qa', 'translation'];
      intelligence.model_version = intelligence.model_version || '1.0.0';
      intelligence.compute_requirements = intelligence.compute_requirements || { memory: 0, compute_units: 0 };
    }

    return {
      token_id: tokenId,
      contract_address: INFT_CONTRACT_ADDRESS as `0x${string}`,
      owner: owner as `0x${string}`,
      created_at: createdAt,
      note_reference: { note_id: noteId, note_cid: '' },
      metadata: {
        name: tokenName,
        description,
        image,
        attributes,
        intelligence,
        created_at: createdAt,
        author: owner as `0x${string}`,
        note_id: noteId,
        note_cid: ''
      }
    };
  } catch (error) {
    console.error('Error getting INFT info:', error);
    return null;
  }
}

/**
 * Get all INFTs owned by an address
 */
export async function getOwnedINFTs(
  ownerAddress: string,
  provider: any
): Promise<INFTInfo[]> {
  try {
    console.log('Getting owned INFTs for address:', ownerAddress);
    
    // Create a provider that supports contract calls
    let contractProvider = provider;
    
    // If provider is walletClient, we need to use a different approach
    if (provider && typeof provider.request === 'function') {
      // This is likely a walletClient, try to get a proper provider
      try {
        // Try to get the provider from the walletClient
        if (provider.getChain) {
          const chain = await provider.getChain();
          const rpcUrl = chain.rpcUrls.default.http[0];
          contractProvider = new ethers.JsonRpcProvider(rpcUrl);
        } else {
          // Fallback: use a default provider (0G Mainnet)
          contractProvider = new ethers.JsonRpcProvider('https://evmrpc.0g.ai/');
        }
      } catch (error) {
        console.warn('Failed to create provider, using fallback:', error);
        contractProvider = new ethers.JsonRpcProvider('https://evmrpc.0g.ai/');
      }
    }
    
    const contract = new ethers.Contract(INFT_CONTRACT_ADDRESS, NOTE3_INFT_ABI, contractProvider);
    
    // Skip balance check since it might not work with walletClient
    console.log('Skipping balance check, scanning for owned tokens...');
    const infts: INFTInfo[] = [];
    
    // Since we don't have tokenOfOwnerByIndex, we'll try to get tokens by checking a range
    // This is a simplified approach - in production, you might want to implement proper enumeration
    const maxTokens = 100; // Reasonable limit for testing
    
    for (let tokenId = 1; tokenId <= maxTokens; tokenId++) {
      try {
        const owner = await contract.ownerOf(tokenId);
        if (owner.toLowerCase() === ownerAddress.toLowerCase()) {
          console.log('Found owned token:', tokenId);
          const inftInfo = await getINFTInfo(tokenId.toString(), contractProvider);
          if (inftInfo) {
            console.log('Successfully loaded INFT info for token:', tokenId);
            infts.push(inftInfo);
          } else {
            console.warn('Failed to load INFT info for token:', tokenId);
          }
        }
      } catch (error) {
        // Token doesn't exist or other error, continue
        continue;
      }
    }
    
    console.log('Total INFTs found:', infts.length);
    return infts;
  } catch (error) {
    console.error('Error getting owned INFTs:', error);
    return [];
  }
}

/**
 * Check if contract supports ERC-7857
 */
export async function isERC7857Compliant(provider: any): Promise<boolean> {
  try {
    const contract = new ethers.Contract(INFT_CONTRACT_ADDRESS, NOTE3_INFT_ABI, provider);
    return await contract.isERC7857Compliant();
  } catch (error) {
    console.error('Error checking ERC-7857 compliance:', error);
    return false;
  }
}

/**
 * Get contract standard
 */
export async function getContractStandard(provider: any): Promise<string> {
  try {
    const contract = new ethers.Contract(INFT_CONTRACT_ADDRESS, NOTE3_INFT_ABI, provider);
    return await contract.getContractStandard();
  } catch (error) {
    console.error('Error getting contract standard:', error);
    return 'Unknown';
  }
}

/**
 * Generate summary for an INFT
 */
export async function generateINFTSummary(
  tokenId: string,
  signer: any
): Promise<void> {
  try {
    const ethersSigner = await toEthersSigner(signer);
    const addr = await ethersSigner.getAddress();
    await ensureOGNetworkAndFunds(addr as `0x${string}`);

    const contract = new ethers.Contract(INFT_CONTRACT_ADDRESS, NOTE3_INFT_ABI, ethersSigner);

    // Preflight: ensure owner and static call to capture revert reason early
    try {
      const owner = await contract.ownerOf(tokenId);
      if (owner?.toLowerCase() !== addr.toLowerCase()) {
        throw new Error('Not owner');
      }
      // Use provider.call with explicit from to surface revert reasons from the node
      const provider = ethersSigner.provider as ethers.Provider;
      if (!provider) throw new Error('No provider');
      const calldata = contract.interface.encodeFunctionData('generateSummary', [BigInt(tokenId)]);
      await provider.call({ to: INFT_CONTRACT_ADDRESS, data: calldata, from: addr });
    } catch (preErr: any) {
      const raw = preErr?.reason || preErr?.message || String(preErr);
      let hint = '';
      if (/Not owner/i.test(raw)) hint = 'Caller is not the owner of this INFT token.';
      else if (/Token does not exist/i.test(raw)) hint = 'Token ID does not exist on the contract.';
      throw new Error(hint ? `${raw} — ${hint}` : raw);
    }

    const tx = await contract.generateSummary(BigInt(tokenId), { gasLimit: 300000n });
    await tx.wait();
  } catch (error) {
    const raw = (error as any)?.message || String(error);
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
    console.error('Error generating INFT summary:', raw);
    throw new Error(hint ? `${raw} — ${hint}` : raw);
  }
}

/**
 * Add Q&A pair to an INFT
 */
export async function addINFTQAPair(
  tokenId: string,
  question: string,
  answer: string,
  signer: any
): Promise<void> {
  try {
    const ethersSigner = await toEthersSigner(signer);
    const addr = await ethersSigner.getAddress();
    await ensureOGNetworkAndFunds(addr as `0x${string}`);

    const contract = new ethers.Contract(INFT_CONTRACT_ADDRESS, NOTE3_INFT_ABI, ethersSigner);
    const tx = await contract.addQAPair(tokenId, question, answer);
    await tx.wait();
  } catch (error) {
    const raw = (error as any)?.message || String(error);
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
    console.error('Error adding Q&A pair:', raw);
    throw new Error(hint ? `${raw} — ${hint}` : raw);
  }
}

/**
 * Get summary for an INFT
 */
export async function getINFTSummary(
  tokenId: string,
  provider: any
): Promise<string> {
  try {
    const contract = new ethers.Contract(INFT_CONTRACT_ADDRESS, NOTE3_INFT_ABI, provider);
    return await contract.getSummary(tokenId);
  } catch (error) {
    console.error('Error getting INFT summary:', error);
    return '';
  }
}

/**
 * Get Q&A pairs for an INFT
 */
export async function getINFTQAPairs(
  tokenId: string,
  provider: any
): Promise<string[]> {
  try {
    const contract = new ethers.Contract(INFT_CONTRACT_ADDRESS, NOTE3_INFT_ABI, provider);
    return await contract.getQAPairs(tokenId);
  } catch (error) {
    console.error('Error getting INFT Q&A pairs:', error);
    return [];
  }
}

/**
 * Get intelligence configuration for an INFT
 */
export async function getINFTIntelligenceConfig(
  tokenId: string,
  provider: any
): Promise<INFTIntelligence> {
  try {
    const contract = new ethers.Contract(INFT_CONTRACT_ADDRESS, NOTE3_INFT_ABI, provider);
    const config = await contract.getIntelligenceConfig(tokenId);
    
    return {
      capabilities: config.capabilities,
      model_version: config.modelVersion,
      compute_requirements: {
        memory: Number(config.memoryRequirement),
        compute_units: Number(config.computeUnits)
      },
      data_sources: config.dataSources,
      prompt_template: config.promptTemplate
    };
  } catch (error) {
    console.error('Error getting INFT intelligence config:', error);
    return {
      capabilities: [],
      model_version: '1.0.0',
      compute_requirements: {
        memory: 0,
        compute_units: 0
      },
      data_sources: [],
      prompt_template: ''
    };
  }
}