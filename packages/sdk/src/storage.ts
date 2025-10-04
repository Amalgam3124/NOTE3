// Complete 0G Storage implementation
// Access 0G Storage functionality through SDK package

// Define types locally to avoid SSR issues
type Note = {
  id: string;
  title: string;
  markdown: string;
  images: string[];
  inlineImages: ImageUpload[];
  public: boolean;
  createdAt: number;
  author: string;
  category?: string;
  tags?: string[];
  version?: number;
  parentId?: string;
};

type ImageUpload = {
  cid: string;
  name: string;
  size: number;
  type: string;
  markdown: string;
};

// Extended Note type with CID
type NoteWithCID = Note & { cid?: string };

// 0G Storage Configuration
const RPC_URL = process.env.NEXT_PUBLIC_OG_ENDPOINT || 'https://evmrpc-testnet.0g.ai/';
const INDEXER_RPC = process.env.NEXT_PUBLIC_OG_INDEXER || 'https://indexer-storage-testnet-turbo.0g.ai';

// 0G Storage configuration - let SDK handle most parameters automatically
const STORAGE_CONFIG = {
  // Use default values - SDK will handle optimization
  TASK_SIZE: 10, // Default from SDK
  EXPECTED_REPLICA: 1,
  FINALITY_REQUIRED: true, // Default from SDK
  FEE: BigInt(0), // Let SDK calculate automatically
};

// 0G SDK calculates fees automatically based on market price
// We don't need to calculate fees manually
export function calculateStorageFee(dataSize: number): bigint {
  // Return 0 to let 0G SDK calculate the fee automatically
  return BigInt('0');
}

// Get actual storage fee from 0G SDK (real-time)
export async function getActualStorageFee(data: any): Promise<bigint> {
  // 0G SDK will calculate the fee automatically during upload
  // We don't need to pre-calculate it
  return BigInt('0');
}

// Convert wallet client to ethers signer
async function toEthersSigner(signer: any): Promise<any> {
  if (signer && typeof signer.getAddress === 'function') {
    // Already an ethers signer
    return signer;
  }
  
  // Convert wagmi wallet client to ethers signer
  if (signer && typeof signer.getAddresses === 'function') {
    const { ethers } = await import('ethers');
    
    // Ensure the signer is connected to the correct network first
    try {
      const currentChainId = await signer.getChainId();
      console.log('0G Storage: Current chain ID:', currentChainId);
      
      if (currentChainId !== 16602) {
        console.log('0G Storage: Switching to 0G Galileo Testnet...');
        await signer.switchChain({ chainId: 16602 });
        console.log('0G Storage: Successfully switched to 0G Galileo Testnet');
      }
    } catch (error) {
      console.error('0G Storage: Failed to switch network:', error);
      throw new Error('Please switch to 0G Galileo Testnet (Chain ID: 16602)');
    }
    
    // Create a proper ethers signer using BrowserProvider
    const provider = new ethers.BrowserProvider(signer);
    const signerAddress = await signer.getAddresses();
    const ethersSigner = await provider.getSigner(signerAddress[0]);
    
    // Verify the signer is working
    const network = await provider.getNetwork();
    console.log('0G Storage: Signer network:', network);
    
    // Test the signer by getting the address
    const address = await ethersSigner.getAddress();
    console.log('0G Storage: Signer address:', address);
    
    // Test gas price retrieval
    try {
      const feeData = await provider.getFeeData();
      console.log('0G Storage: Fee data:', feeData);
      
      if (!feeData.gasPrice) {
        console.warn('0G Storage: No gas price available, this might cause issues');
      }
      
      // Test network connection
      const network = await provider.getNetwork();
      console.log('0G Storage: Network details:', {
        chainId: network.chainId,
        name: network.name
      });
      
      // Verify we're on the correct network
      if (Number(network.chainId) !== 16602) {
        throw new Error(`Wrong network: expected 16602, got ${network.chainId}`);
      }
      
  } catch (error) {
      console.error('0G Storage: Failed to get fee data or verify network:', error);
      throw error;
    }
    
    return ethersSigner;
  }
  
  throw new Error('Invalid signer provided - expected wallet client with getAddresses method');
}

// Get wallet address from signer
async function getWalletAddress(signer: any): Promise<string> {
  if (signer && typeof signer.getAddress === 'function') {
    return await signer.getAddress();
  }
  
  if (signer && typeof signer.getAddresses === 'function') {
    const addresses = await signer.getAddresses();
    return addresses[0];
  }
  
  if (signer && signer.account && signer.account.address) {
    return signer.account.address;
  }
  
  throw new Error('Cannot get wallet address from signer');
}

// Build transaction - let 0G SDK handle gas configuration
function buildOGTransaction(wallet: any, data: string, to?: string): any {
  return {
    to: to || '0x22e03a6a89b950f1c82ec5e74f8eca321a105296', // 0G Storage contract address
    data: data,
    chainId: 0x40da, // 0G Galileo Testnet
    // Let 0G SDK handle gas configuration automatically
  };
}

// Save note to 0G Storage
export async function saveNote(
  title: string, 
  content: string, 
  signer: any, 
  options: {
    category?: string;
    tags?: string[];
    public?: boolean;
    images?: string[];
    inlineImages?: Array<{ markdown: string; file: File }>;
  } = {}
): Promise<{ note: NoteWithCID; cid: string; txHash: string }> {
  try {
  if (!signer) {
    throw new Error('Wallet not connected');
  }

    const address = await getWalletAddress(signer);
    console.log('0G Storage: Saving note with wallet address:', address);
    
    // Create note object
    const note: NoteWithCID = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      markdown: content.trim(),
      images: options.images || [],
      inlineImages: options.inlineImages?.map(img => ({
        cid: '', // Will be filled after upload
        name: img.file.name,
        size: img.file.size,
        type: img.file.type,
        markdown: img.markdown
      })) || [],
      public: options.public || false,
      createdAt: Date.now(),
      author: address,
      category: options.category || '',
      tags: options.tags || [],
      version: 1
    };

    console.log('0G Storage: Note prepared for upload:', {
      id: note.id,
      title: note.title,
      contentLength: note.markdown.length,
      imagesCount: note.images.length,
      inlineImagesCount: note.inlineImages.length
    });

    // Convert to JSON
    const noteData = JSON.stringify(note);
    console.log('0G Storage: Note data size:', noteData.length, 'bytes');

    // Upload to 0G Storage
    const result = await putJSON(noteData, signer);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to upload note to 0G Storage');
    }

    console.log('0G Storage: Note uploaded successfully:', {
      cid: result.cid,
      txHash: result.txHash,
      size: result.size
    });

    // Update note with CID
    note.cid = result.cid;

    return {
      note,
      cid: result.cid!,
      txHash: result.txHash!
    };

  } catch (error) {
    console.error('0G Storage: Failed to save note:', error);
    throw error;
  }
}

// Load note from 0G Storage
export async function loadNote(cid: string, signer: any): Promise<NoteWithCID | null> {
  try {
  if (!signer) {
    throw new Error('Wallet not connected');
  }

    console.log('0G Storage: Loading note with CID:', cid);
    
    const result = await getJSON(cid, signer);
    
    if (!result.success || !result.data) {
      console.error('0G Storage: Failed to load note:', result.error);
      return null;
    }

    console.log('0G Storage: Note loaded successfully:', {
      id: result.data.id,
      title: result.data.title,
      contentLength: result.data.markdown?.length || 0
    });

    return result.data as NoteWithCID;

      } catch (error) {
    console.error('0G Storage: Failed to load note:', error);
    return null;
  }
}

// Upload JSON data to 0G Storage
export async function putJSON(data: string, signer: any): Promise<{ success: boolean; cid?: string; txHash?: string; size?: number; error?: string }> {
  try {
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    const address = await getWalletAddress(signer);
    console.log('0G Storage: Uploading JSON with wallet address:', address);
    
    console.log('0G Storage: Data details:', {
      size: data.length,
      type: 'application/json'
    });
    
    // Let 0G SDK calculate fee automatically
    const calculatedFee = BigInt('0');
    console.log('0G Storage: Using automatic fee calculation by 0G SDK');
    
    console.log('0G Storage: Initializing indexer with:', INDEXER_RPC);
    const sdk = await import('@0glabs/0g-ts-sdk');
    const { Indexer, Blob: ZgBlob } = sdk as any;
    const indexer = new Indexer(INDEXER_RPC);
    
    const ethersSigner = await toEthersSigner(signer);
    console.log('0G Storage: Using ethers Signer for JSON upload');
    
    if (!RPC_URL) {
      throw new Error('RPC_URL is not configured');
    }
    
    // Create native Blob first, then wrap it with 0G SDK Blob
    const nativeBlob = new Blob([data], { type: 'application/json' });
    const file = new ZgBlob(nativeBlob);
    
    // Get Merkle tree
    const [tree, treeErr] = await file.merkleTree();
    if (treeErr !== null || tree === null) {
      throw new Error(`Failed to create Merkle tree: ${treeErr}`);
    }
    
    console.log('0G Storage: File prepared for upload', {
      rootHash: tree.rootHash(),
      size: file.size(),
      numSegments: file.numSegments(),
      numChunks: file.numChunks()
    });
    
    // Use SDK default configuration
    const uploadOptions = {
      tags: '0x',
      finalityRequired: STORAGE_CONFIG.FINALITY_REQUIRED,
      taskSize: STORAGE_CONFIG.TASK_SIZE,
      expectedReplica: STORAGE_CONFIG.EXPECTED_REPLICA,
      skipTx: false,
      fee: STORAGE_CONFIG.FEE,
      nonce: undefined
    };
    
    // Add retry options for better error handling
    const retryOptions = {
      Retries: 5,
      Interval: 3,
      MaxGasPrice: BigInt('20000000000') // 20 gwei max gas price
    };
    
    console.log('0G Storage: Upload options:', {
      fee: uploadOptions.fee.toString(),
      taskSize: uploadOptions.taskSize,
      expectedReplica: uploadOptions.expectedReplica,
      finalityRequired: uploadOptions.finalityRequired
    });
    
    const [tx, uploadErr] = await indexer.upload(file, RPC_URL, ethersSigner, uploadOptions, retryOptions, undefined);
    console.log('0G Storage: Upload response:', { tx, uploadErr });
    
    if (uploadErr !== null) {
      throw new Error(`Upload failed: ${uploadErr.message || uploadErr}`);
    }
    
    console.log('0G Storage: Upload successful! Transaction:', tx);
    
    let txHash: string;
    
    if (typeof tx === 'string') {
      txHash = tx;
    } else if (tx && typeof tx === 'object' && 'txHash' in tx) {
      txHash = tx.txHash;
    } else {
      throw new Error('Invalid transaction response format');
    }
    
    console.log('0G Storage: Transaction hash:', txHash);
    
    // Return the result
          return {
      success: true,
      cid: tree.rootHash(),
      txHash: txHash,
      size: file.size()
    };
    
  } catch (error) {
    console.error('0G Storage: Upload failed:', error);
          return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
      cid: undefined,
      txHash: undefined,
      size: 0
    };
  }
}

// Download JSON data from 0G Storage
export async function getJSON(cid: string, signer: any): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    console.log('0G Storage: Downloading JSON with CID:', cid);
    
    const sdk = await import('@0glabs/0g-ts-sdk');
    const { Indexer, Downloader } = sdk as any;
    const indexer = new Indexer(INDEXER_RPC);
    
    // Get file locations first
    const locations = await indexer.getFileLocations(cid);
    
    if (!locations || locations.length === 0) {
      throw new Error('File not found on any storage node');
    }
    
    console.log('0G Storage: Found file locations:', locations);
    
    // Try to use Downloader class for proper download
    try {
      console.log('0G Storage: Using Downloader class...');
      
      // Convert ShardedNode objects to StorageNode instances
      const { StorageNode } = sdk as any;
      const storageNodes = locations.map((location: any) => new StorageNode(location.url));
      
      // Create Downloader with StorageNode instances
      const downloader = new Downloader(storageNodes);
      
      // Query file info first
      const [fileInfo, queryError] = await downloader.queryFile(cid);
      
      if (queryError || !fileInfo) {
        throw new Error(`Failed to query file: ${queryError?.message || 'No file info'}`);
      }
      
      console.log('0G Storage: File info retrieved:', fileInfo);
      
      // Get shard configs first (required for downloadTask)
      const { getShardConfigs } = await import('@0glabs/0g-ts-sdk');
      const shardConfigs = await getShardConfigs(storageNodes);
      
      if (!shardConfigs) {
        throw new Error('Failed to get shard configs');
      }
      
      console.log('0G Storage: Shard configs retrieved:', shardConfigs);
      
      // Set shard configs in downloader
      downloader.shardConfigs = shardConfigs;
      
      // Calculate segment indices
      const { DEFAULT_SEGMENT_MAX_CHUNKS, DEFAULT_CHUNK_SIZE } = await import('@0glabs/0g-ts-sdk');
      const { GetSplitNum } = await import('@0glabs/0g-ts-sdk');
      
      const numChunks = GetSplitNum(fileInfo.tx.size, DEFAULT_CHUNK_SIZE);
      const startSegmentIndex = Math.floor(fileInfo.tx.startEntryIndex / DEFAULT_SEGMENT_MAX_CHUNKS);
      const endSegmentIndex = Math.floor((fileInfo.tx.startEntryIndex + GetSplitNum(fileInfo.tx.size, DEFAULT_CHUNK_SIZE) - 1) / DEFAULT_SEGMENT_MAX_CHUNKS);
      
      downloader.startSegmentIndex = startSegmentIndex;
      downloader.endSegmentIndex = endSegmentIndex;
      
      console.log('0G Storage: Segment indices calculated:', { startSegmentIndex, endSegmentIndex, numChunks });
      
      // Download the file data using downloadTask
      const [fileData, downloadError] = await downloader.downloadTask(fileInfo, 0, 0, numChunks, false);
      
      if (downloadError || !fileData) {
        throw new Error(`Failed to download file data: ${downloadError?.message || 'No data'}`);
      }
      
      console.log('0G Storage: File data downloaded successfully');
      
      // Convert the data to text and parse JSON
      const text = new TextDecoder().decode(fileData);
      const jsonData = JSON.parse(text);
      
      console.log('0G Storage: JSON parsed successfully');
        
        return {
        success: true,
        data: jsonData
      };
      
    } catch (downloaderError) {
      console.log('0G Storage: Downloader failed, trying direct HTTP download:', downloaderError);
      
      // Fallback: Try direct HTTP download from storage nodes
      for (const location of locations) {
        try {
          console.log('0G Storage: Trying to download from node:', location.url);
          
          // Try different download endpoints
          const endpoints = [
            `${location.url}/download/${cid}`,
            `${location.url}/file/${cid}`,
            `${location.url}/get/${cid}`,
            `${location.url}/api/v1/file/${cid}`,
            `${location.url}/api/v1/download/${cid}`
          ];
          
          for (const endpoint of endpoints) {
            try {
              const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json, */*',
                  'Content-Type': 'application/json'
                },
                mode: 'cors'
              });
              
              if (response.ok) {
                const blob = await response.blob();
                const text = await blob.text();
                
                // Parse JSON
                const jsonData = JSON.parse(text);
                
                console.log('0G Storage: JSON downloaded and parsed successfully from:', endpoint);
                
                return {
                  success: true,
                  data: jsonData
                };
              } else {
                console.log('0G Storage: Download failed from endpoint:', endpoint, response.status);
              }
            } catch (endpointError) {
              console.log('0G Storage: Failed to download from endpoint:', endpoint, endpointError);
              continue;
            }
          }
          
        } catch (nodeError) {
          console.log('0G Storage: Failed to download from node:', location.url, nodeError);
          continue;
        }
      }
      
      throw new Error('Failed to download from all available nodes and methods');
    }
    
  } catch (error) {
    console.error('0G Storage: Download failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Download failed'
    };
  }
}

// Upload file to 0G Storage
export async function putFile(file: File, signer: any): Promise<{ cid: string }> {
  try {
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    const address = await getWalletAddress(signer);
    console.log('0G Storage: Uploading file with wallet address:', address);
    
    console.log('0G Storage: File details:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
         // Let 0G SDK calculate fee automatically
     const calculatedFee = BigInt('0');
     console.log('0G Storage: Using automatic fee calculation by 0G SDK');
    
    console.log('0G Storage: Initializing indexer with:', INDEXER_RPC);
    const sdk = await import('@0glabs/0g-ts-sdk');
    const { Indexer, Blob: ZgBlob } = sdk as any;
    const indexer = new Indexer(INDEXER_RPC);
    
    const ethersSigner = await toEthersSigner(signer);
    console.log('0G Storage: Using ethers Signer for file upload');
    
    if (!RPC_URL) {
      throw new Error('RPC_URL is not configured');
    }
    
        console.log('0G Storage: Wrapping File with 0G SDK Blob...');
        const sdkFile = new ZgBlob(file);
        
        console.log('0G Storage: Generating Merkle tree for file...');
        const [tree, treeErr] = await sdkFile.merkleTree();
        if (treeErr !== null) {
          throw new Error(`Failed to generate Merkle tree: ${treeErr}`);
        }
        
        const rootHash = tree?.rootHash();
        if (!rootHash) {
          throw new Error('Failed to get root hash from Merkle tree');
        }
        
        console.log('0G Storage: File Root Hash:', rootHash);
        
    // Use SDK default configuration
         const uploadOptions = {
           tags: '0x',
      finalityRequired: STORAGE_CONFIG.FINALITY_REQUIRED,
      taskSize: STORAGE_CONFIG.TASK_SIZE,
      expectedReplica: STORAGE_CONFIG.EXPECTED_REPLICA,
           skipTx: false,
      fee: STORAGE_CONFIG.FEE,
           nonce: undefined
         };
        
        console.log('0G Storage: File upload options:', {
          fee: uploadOptions.fee.toString(),
          taskSize: uploadOptions.taskSize,
          fileSize: file.size
        });
        
        const [tx, uploadErr] = await indexer.upload(sdkFile, RPC_URL, ethersSigner, uploadOptions, undefined, undefined);
        console.log('0G Storage: File upload response:', { tx, uploadErr });
        
        if (uploadErr !== null) {
      throw new Error(`File upload failed: ${uploadErr.message || uploadErr}`);
    }
    
          console.log('0G Storage: File upload successful! Transaction:', tx);
          
          let txHash: string;
          
          if (typeof tx === 'string') {
            txHash = tx;
          } else if (tx && typeof tx === 'object' && 'hash' in tx) {
            txHash = tx.hash;
          } else if (tx && typeof tx === 'object' && 'transactionHash' in tx) {
            txHash = tx.transactionHash;
          } else {
            const txString = JSON.stringify(tx);
            const hashMatch = txString.match(/0x[a-fA-F0-9]{64}/);
            if (hashMatch) {
              txHash = hashMatch[0];
            } else {
              throw new Error(`File upload successful but no transaction hash found in response: ${txString}`);
            }
          }
          
    console.log('0G Storage: File upload transaction hash:', txHash);
    
          return { cid: rootHash };
    
  } catch (error) {
    console.error('0G Storage: File upload failed:', error);
    throw error;
  }
}

// Download file from 0G Storage
export async function getFile(cid: string, signer: any): Promise<File | null> {
  try {
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    console.log('0G Storage: Downloading file with CID:', cid);
    
      const sdk = await import('@0glabs/0g-ts-sdk');
      const { Indexer } = sdk as any;
      const indexer = new Indexer(INDEXER_RPC);
      
    // Download file
    const tempPath = `/tmp/download-${Date.now()}`;
    const downloadErr = await indexer.download(cid, tempPath, false);
      
      if (downloadErr !== null) {
      throw new Error(`Download failed: ${downloadErr.message || downloadErr}`);
    }
    
    // Read file content
    const fs = await import('fs');
    const data = fs.readFileSync(tempPath);
    
    // Clean up temp file
    try {
      fs.unlinkSync(tempPath);
    } catch (cleanupErr) {
      console.warn('Failed to clean up temp file:', cleanupErr);
    }
    
    // Create File object
    const file = new File([data], `download-${cid.slice(0, 8)}`, { type: 'application/octet-stream' });
    
    console.log('0G Storage: File downloaded successfully:', {
      name: file.name,
      size: file.size
    });
    
    return file;
    
  } catch (error) {
    console.error('0G Storage: File download failed:', error);
    return null;
  }
}