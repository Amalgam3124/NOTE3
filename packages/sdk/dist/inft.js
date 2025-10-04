import { ethers } from 'ethers';
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
// Contract address (will be set from environment)
const INFT_CONTRACT_ADDRESS = '0x378Eb988f4cD091dC78ec16DD7fD173b29dD8D04';
// Ensure the contract address is valid
if (!INFT_CONTRACT_ADDRESS || !INFT_CONTRACT_ADDRESS.startsWith('0x')) {
    throw new Error('Invalid INFT contract address. Please set NEXT_PUBLIC_INFT_CONTRACT_ADDRESS environment variable.');
}
/**
 * Convert a note to INFT with intelligence capabilities
 */
export async function convertNoteToINFT(note, signer, provider, intelligenceConfig) {
    try {
        const contract = new ethers.Contract(INFT_CONTRACT_ADDRESS, NOTE3_INFT_ABI, signer);
        // Generate proofs - verifier expects 32-byte data hashes
        // For Note3Verifier, the proof is the data hash itself (32 bytes)
        const contentHash = ethers.keccak256(ethers.toUtf8Bytes(note.id + '-content'));
        const metadataHash = ethers.keccak256(ethers.toUtf8Bytes(note.id + '-metadata'));
        const proofs = [
            ethers.getBytes(contentHash), // Convert to bytes32
            ethers.getBytes(metadataHash) // Convert to bytes32
        ];
        // Generate data descriptions
        const dataDescriptions = [
            'Note content',
            'Note metadata'
        ];
        // Default intelligence configuration
        const defaultIntelligenceConfig = {
            capabilities: ['summary', 'qa', 'translation'],
            modelVersion: '1.0.0',
            memoryRequirement: 512,
            computeUnits: 1000,
            dataSources: [note.id],
            promptTemplate: `You are an AI assistant for analyzing the note "${note.title || note.id}". Please provide helpful summaries and answer questions about the note content.`,
            isEncrypted: false
        };
        // Merge with provided config
        const finalConfig = { ...defaultIntelligenceConfig, ...intelligenceConfig };
        // Get address from signer (compatible with both ethers signer and wagmi walletClient)
        let signerAddress;
        if (typeof signer.getAddress === 'function') {
            signerAddress = await signer.getAddress();
        }
        else if (typeof signer.getAddresses === 'function') {
            const addresses = await signer.getAddresses();
            signerAddress = addresses[0];
        }
        else if (signer.address) {
            signerAddress = signer.address;
        }
        else {
            throw new Error('Unable to get address from signer');
        }
        // Skip gas estimation since walletClient doesn't support it
        // Use a reasonable gas limit instead
        const gasLimit = 500000n; // Reasonable gas limit for minting
        console.log('Attempting Note3 INFT mint with noteId:', note.id, 'and gas limit:', gasLimit.toString());
        // Try Note3 INFT mint with intelligence config
        const mintTx = await contract.mintNote3INFT(proofs, dataDescriptions, note.id, // Pass the actual note ID
        signerAddress, finalConfig, // Pass the intelligence configuration
        {
            gasLimit: gasLimit
        });
        // Wait for transaction confirmation
        let receipt;
        try {
            receipt = await mintTx.wait();
            console.log('Note3 INFT mint successful, receipt:', receipt);
        }
        catch (error) {
            console.warn('tx.wait() failed, trying alternative method:', error);
            // Alternative: just use the transaction hash
            receipt = {
                hash: mintTx.hash,
                logs: []
            };
        }
        // Extract token ID from mint event
        let tokenId = 1; // Default fallback
        try {
            const mintEvent = receipt.logs.find((log) => {
                try {
                    const parsed = contract.interface.parseLog(log);
                    return parsed?.name === 'Minted';
                }
                catch {
                    return false;
                }
            });
            if (mintEvent) {
                const parsed = contract.interface.parseLog(mintEvent);
                tokenId = parsed?.args?.tokenId?.toString() || 1;
                console.log('Extracted token ID from mint event:', tokenId);
            }
        }
        catch (error) {
            console.warn('Failed to extract token ID from mint event:', error);
        }
        // Extract transaction hash for return
        const transactionHash = mintTx.hash || receipt?.hash || 'unknown';
        return {
            inft_token_id: tokenId.toString(),
            inft_contract_address: INFT_CONTRACT_ADDRESS,
            metadata_uri: '',
            transaction_hash: transactionHash,
            gas_used: receipt?.gasUsed || 0,
            conversion_timestamp: Math.floor(Date.now() / 1000)
        };
    }
    catch (error) {
        console.error('Error converting note to INFT:', error);
        throw error;
    }
}
/**
 * Get INFT information
 */
export async function getINFTInfo(tokenId, provider) {
    try {
        const contract = new ethers.Contract(INFT_CONTRACT_ADDRESS, NOTE3_INFT_ABI, provider);
        // Get basic info first
        const owner = await contract.ownerOf(tokenId);
        // Try to get additional info, but don't fail if they don't exist
        let tokenURI = '';
        let noteId = tokenId;
        let tokenName = `note3-${tokenId}`;
        let dataHashes = [];
        let dataDescriptions = [];
        try {
            tokenURI = await contract.tokenURI(tokenId);
        }
        catch (error) {
            console.warn('Failed to get tokenURI:', error);
        }
        try {
            noteId = await contract.getNoteId(tokenId);
        }
        catch (error) {
            console.warn('Failed to get noteId:', error);
        }
        try {
            tokenName = await contract.getTokenName(tokenId);
        }
        catch (error) {
            console.warn('Failed to get tokenName:', error);
        }
        try {
            dataHashes = await contract.dataHashesOf(tokenId);
        }
        catch (error) {
            console.warn('Failed to get dataHashes:', error);
        }
        try {
            dataDescriptions = await contract.dataDescriptionsOf(tokenId);
        }
        catch (error) {
            console.warn('Failed to get dataDescriptions:', error);
        }
        return {
            token_id: tokenId,
            contract_address: INFT_CONTRACT_ADDRESS,
            owner: owner,
            created_at: Math.floor(Date.now() / 1000),
            note_reference: {
                note_id: noteId,
                note_cid: ''
            },
            metadata: {
                name: tokenName,
                description: 'Note converted to INFT',
                image: '',
                attributes: [
                    { trait_type: 'Type', value: 'Note' },
                    { trait_type: 'Note ID', value: noteId },
                    { trait_type: 'Data Hashes', value: dataHashes.length.toString() }
                ],
                intelligence: {
                    capabilities: [],
                    model_version: '1.0.0',
                    compute_requirements: {
                        memory: 0,
                        compute_units: 0
                    },
                    data_sources: [],
                    prompt_template: ''
                },
                created_at: Math.floor(Date.now() / 1000),
                author: owner,
                note_id: noteId,
                note_cid: ''
            }
        };
    }
    catch (error) {
        console.error('Error getting INFT info:', error);
        return null;
    }
}
/**
 * Get all INFTs owned by an address
 */
export async function getOwnedINFTs(ownerAddress, provider) {
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
                }
                else {
                    // Fallback: use a default provider
                    contractProvider = new ethers.JsonRpcProvider('https://evmrpc-testnet.0g.ai/');
                }
            }
            catch (error) {
                console.warn('Failed to create provider, using fallback:', error);
                contractProvider = new ethers.JsonRpcProvider('https://evmrpc-testnet.0g.ai/');
            }
        }
        const contract = new ethers.Contract(INFT_CONTRACT_ADDRESS, NOTE3_INFT_ABI, contractProvider);
        // Skip balance check since it might not work with walletClient
        console.log('Skipping balance check, scanning for owned tokens...');
        const infts = [];
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
                    }
                    else {
                        console.warn('Failed to load INFT info for token:', tokenId);
                    }
                }
            }
            catch (error) {
                // Token doesn't exist or other error, continue
                continue;
            }
        }
        console.log('Total INFTs found:', infts.length);
        return infts;
    }
    catch (error) {
        console.error('Error getting owned INFTs:', error);
        return [];
    }
}
/**
 * Check if contract supports ERC-7857
 */
export async function isERC7857Compliant(provider) {
    try {
        const contract = new ethers.Contract(INFT_CONTRACT_ADDRESS, NOTE3_INFT_ABI, provider);
        return await contract.isERC7857Compliant();
    }
    catch (error) {
        console.error('Error checking ERC-7857 compliance:', error);
        return false;
    }
}
/**
 * Get contract standard
 */
export async function getContractStandard(provider) {
    try {
        const contract = new ethers.Contract(INFT_CONTRACT_ADDRESS, NOTE3_INFT_ABI, provider);
        return await contract.getContractStandard();
    }
    catch (error) {
        console.error('Error getting contract standard:', error);
        return 'Unknown';
    }
}
/**
 * Generate summary for an INFT
 */
export async function generateINFTSummary(tokenId, signer) {
    try {
        const contract = new ethers.Contract(INFT_CONTRACT_ADDRESS, NOTE3_INFT_ABI, signer);
        const tx = await contract.generateSummary(tokenId);
        await tx.wait();
    }
    catch (error) {
        console.error('Error generating INFT summary:', error);
        throw error;
    }
}
/**
 * Add Q&A pair to an INFT
 */
export async function addINFTQAPair(tokenId, question, answer, signer) {
    try {
        const contract = new ethers.Contract(INFT_CONTRACT_ADDRESS, NOTE3_INFT_ABI, signer);
        const tx = await contract.addQAPair(tokenId, question, answer);
        await tx.wait();
    }
    catch (error) {
        console.error('Error adding Q&A pair:', error);
        throw error;
    }
}
/**
 * Get summary for an INFT
 */
export async function getINFTSummary(tokenId, provider) {
    try {
        const contract = new ethers.Contract(INFT_CONTRACT_ADDRESS, NOTE3_INFT_ABI, provider);
        return await contract.getSummary(tokenId);
    }
    catch (error) {
        console.error('Error getting INFT summary:', error);
        return '';
    }
}
/**
 * Get Q&A pairs for an INFT
 */
export async function getINFTQAPairs(tokenId, provider) {
    try {
        const contract = new ethers.Contract(INFT_CONTRACT_ADDRESS, NOTE3_INFT_ABI, provider);
        return await contract.getQAPairs(tokenId);
    }
    catch (error) {
        console.error('Error getting INFT Q&A pairs:', error);
        return [];
    }
}
/**
 * Get intelligence configuration for an INFT
 */
export async function getINFTIntelligenceConfig(tokenId, provider) {
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
    }
    catch (error) {
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
