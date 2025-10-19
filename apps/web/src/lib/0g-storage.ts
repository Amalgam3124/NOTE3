// Complete 0G Storage implementation
// Access 0G Storage functionality through SDK package

import { createPublicClient, http } from 'viem';
import { OG_CONFIG } from './config';

// Define types locally to avoid SSR issues
type Note = {
  id: string;
  title: string;
  markdown: string;
  images: string[];
  inlineImages: ImageUpload[];
  public: boolean;
  createdAt: number;
  author: `0x${string}`;
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

async function ensureOGNetworkAndFunds(signer: any, address: `0x${string}`) {
  try {
    const chainId = (signer?.chain?.id) ?? (typeof signer?.getChainId === 'function' ? await signer.getChainId() : undefined);
    if (typeof window !== 'undefined' && chainId !== 16602 && (window as any).ethereum) {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x40da' }],
      });
      console.log('0G Storage: Switched wallet to 0G Galileo (16602)');
    }
  } catch (switchErr) {
    console.warn('0G Storage: Network switch skipped/failed:', switchErr);
  }

  // Balance check using public client
  const client = createPublicClient({ transport: http(OG_CONFIG.RPC_URL) });
  const balance = await client.getBalance({ address });
  console.log('0G Storage: Wallet balance (wei):', balance.toString());
  const minBalanceWei = 1_000_000_000_000_000n; // 0.001 OG
  if (balance < minBalanceWei) {
    throw new Error('Insufficient 0G balance (>= 0.001 OG required). Get tokens: https://faucet.0g.ai/');
  }
}

// Save note to 0G Storage
export async function saveNote(
  title: string,
  content: string,
  signer: any,
  options?: {
    category?: string;
    tags?: string[];
    images?: File[];
    inlineImages?: Array<{ markdown: string; file: File }>;
    isEdit?: boolean;
    originalId?: string;
  }
): Promise<{ note: NoteWithCID; estimatedFee: bigint }> {
  try {
    console.log('0G Storage: Starting note upload...', options);
    
    // Validate signer
    if (!signer) {
      throw new Error('Wallet not connected');
    }
    
    // Log signer details for debugging
    console.log('0G Storage: Signer type:', typeof signer);
    console.log('0G Storage: Signer properties:', Object.getOwnPropertyNames(signer));
    
    // Get wallet address
    let walletAddress: `0x${string}`;
    try {
      if (typeof signer.getAddress === 'function') {
        walletAddress = await signer.getAddress();
      } else if (typeof signer.account === 'object' && signer.account?.address) {
        walletAddress = signer.account.address;
      } else {
        throw new Error('Unable to get wallet address from signer');
      }
    } catch (error) {
      console.error('0G Storage: Failed to get wallet address:', error);
      throw new Error('Failed to get wallet address from signer');
    }
    
    console.log('0G Storage: Wallet address:', walletAddress);

    // Preflight: ensure correct network & sufficient balance
    await ensureOGNetworkAndFunds(signer, walletAddress);
    
         // Handle image uploads if provided
     let imageCids: string[] = [];
     let imageDetails: ImageUpload[] = [];
     
     if (options?.images && options.images.length > 0) {
       console.log('0G Storage: Uploading cover images...');
       const { uploadImages } = await import('./image-storage');
      const { cids, imageDetails: uploadedImages } = await uploadImages(options.images, signer);
      imageCids = cids;
      imageDetails = uploadedImages;
      console.log('0G Storage: Uploaded images:', imageCids);
    }
    
    // Handle inline images inside markdown if provided
    if (options?.inlineImages && options.inlineImages.length > 0) {
      console.log('0G Storage: Uploading inline images...');
      const { uploadInlineImages } = await import('./inline-image-uploader');
      const inlineUploads = await uploadInlineImages(options.inlineImages, signer);
      const inlineDetails: ImageUpload[] = inlineUploads.map(u => ({
        cid: u.cid,
        name: 'inline-image',
        size: 0,
        type: 'image/*',
        markdown: `![Image](https://gateway.0g.ai/ipfs/${u.cid})`
      }));
      imageDetails = imageDetails.concat(inlineDetails);
      console.log('0G Storage: Uploaded inline images:', inlineUploads.map(u => u.cid));
     }
    
    // Create note object
    const note: Note = {
      id: `note-${Date.now()}`,
      title,
      markdown: content,
      images: imageCids,
      inlineImages: imageDetails,
      public: false,
      createdAt: Date.now(),
      author: walletAddress,
      category: options?.category,
      tags: options?.tags,
      version: 1,
      parentId: options?.originalId
    };
    
    // Calculate data size estimate
    const dataSize = new Blob([JSON.stringify(note)]).size;
    
    // Estimate storage fee based on data size (simple heuristic)
    const estimatedFee = BigInt(Math.ceil(dataSize * 0.000001 * 1e18));
    
    console.log('0G Storage: Estimated storage fee:', {
      dataSize,
      estimatedFee: estimatedFee.toString(),
      estimatedFeeOG: parseFloat((Number(estimatedFee) / 1e18).toFixed(6))
    });
    
     // 0G Storage supports large files natively
     // Official SDK: DEFAULT_SEGMENT_SIZE = 256KB, can handle much larger files
     console.log('0G Storage: Data size:', dataSize, 'bytes');
     
     // For very large notes (>1MB), we can still use chunking as a fallback
     if (dataSize > 1024 * 1024) { // 1MB
       console.log('0G Storage: Very large note detected, using chunking as fallback...');
       const chunks = await splitNoteIntoChunks(note, signer);
       
       // Store chunk CIDs in the main note
       note.markdown = `[SPLIT_NOTE:${chunks.join(',')}]`;
       (note as any).chunkCids = chunks;
       
       console.log('0G Storage: Note split into', chunks.length, 'chunks');
     }
    
    // Dynamically import SDK to avoid SSR issues
    const { putJSON } = await import('@onchain-notes/sdk');
    
    // Convert note to JSON string for upload
    const noteData = JSON.stringify(note);
    
    // Upload to 0G Storage
    const result = await putJSON(noteData, signer);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to upload note to 0G Storage');
    }
    
    const { cid } = result;
    
    // Create note with CID
    const noteWithCID: NoteWithCID = {
      ...note,
      cid
    };
    
    console.log('0G Storage: Note uploaded successfully with CID:', cid);
    
    // IMPORTANT: Add the note to local index so it appears on the home page
    // Import the addToLocalIndex function dynamically to avoid SSR issues
    const { addToLocalIndex, updateNoteAfterEdit } = await import('./note');
    
    // Create index item for local storage
    const indexItem = {
      id: note.id,
      title: note.title,
      cid: cid || '',
      createdAt: note.createdAt,
      public: note.public,
      category: note.category,
      tags: note.tags,
      version: note.version,
      parentId: note.parentId,
      hasImages: imageCids.length > 0
    };
    
    if (options?.isEdit && options?.originalId) {
      // Replace the original note with the updated version
      updateNoteAfterEdit(options.originalId, indexItem, cid || '');
      console.log('0G Storage: Note replaced after editing:', indexItem);
    } else {
      // Add new note to local index
      addToLocalIndex(indexItem);
      console.log('0G Storage: Note added to local index:', indexItem);
    }
    
    return { note: noteWithCID, estimatedFee };
  } catch (error) {
    const rawMsg = error instanceof Error ? error.message : String(error);
    let hint = '';
    if (rawMsg.includes('-32603') || /Transaction failed/i.test(rawMsg)) {
      hint = 'Transaction reverted. Check network (ChainId 16602) and wallet balance.';
    } else if (/insufficient funds/i.test(rawMsg)) {
      hint = 'Insufficient funds. Visit https://faucet.0g.ai/ to get test tokens.';
    }
    console.error('0G Storage: saveNote failed:', rawMsg, hint || '');
    throw new Error(hint ? `${rawMsg} — ${hint}` : rawMsg);
  }
}

// Get note from 0G Storage
export async function getNote(cid: string, signer?: any): Promise<Note> {
  try {
    console.log('0G Storage: Fetching note with CID:', cid);
    
    // Dynamically import SDK to avoid SSR issues
    const { getJSON } = await import('@onchain-notes/sdk');
    
    const result = await getJSON(cid, signer);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch note');
    }
    
    const note = result.data;
    console.log('0G Storage: Note fetched successfully:', note);
    
    // Check if this is a split note and reconstruct it
    if (note.markdown && note.markdown.startsWith('[SPLIT_NOTE:') && note.markdown.endsWith(']')) {
      console.log('0G Storage: Detected split note, reconstructing...');
      const reconstructedNote = await reconstructSplitNote(note, signer);
      return reconstructedNote;
    }
    
    return note;
  } catch (error) {
    console.error('0G Storage: Failed to fetch note:', error);
    throw error;
  }
}

export async function getNoteHistory(noteId: string): Promise<Note[]> {
  try {
    console.log('0G Storage: Fetching note history for ID:', noteId);

    // Try to load history from localStorage if present
    if (typeof window !== 'undefined') {
      const key = `note-history-${noteId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          console.log('0G Storage: Loaded note history from localStorage:', parsed.length);
          return parsed as Note[];
        }
      }
    }

    console.log('0G Storage: No history found, returning empty list');
    return [];
  } catch (error) {
    console.error('0G Storage: Failed to fetch note history:', error);
    return [];
  }
}

async function splitNoteIntoChunks(note: Note, signer: any): Promise<string[]> {
  console.log('0G Storage: Splitting note into chunks...');
  const { putFile } = await import('@onchain-notes/sdk');
  const chunks: string[] = [];

  const encoder = new TextEncoder();
  const data = encoder.encode(note.markdown);

  const chunkSize = 512 * 1024; // 512KB
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    const blob = new Blob([chunk], { type: 'application/octet-stream' });

    const file = new File([blob], `note-chunk-${i / chunkSize}.bin`, {
      type: 'application/octet-stream'
    });

    const { cid } = await putFile(file, signer);
    chunks.push(cid);
  }

  return chunks;
}

async function reconstructSplitNote(splitNote: Note, signer?: any): Promise<Note> {
  console.log('0G Storage: Reconstructing split note...');

  const content = splitNote.markdown;
  const matches = content.match(/^\[SPLIT_NOTE:(.+)\]$/);
  if (!matches) return splitNote;

  const cids = matches[1].split(',');
  const { getJSON } = await import('@onchain-notes/sdk');

  const decoder = new TextDecoder();
  let combined = '';

  for (const cid of cids) {
    const result = await getJSON(cid, signer);
    if (!result.success || !result.data) continue;

    const chunkText = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
    combined += chunkText;
  }

  return { ...splitNote, markdown: combined };
}
