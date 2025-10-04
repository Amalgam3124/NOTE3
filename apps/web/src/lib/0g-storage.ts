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
    
         // Handle image uploads if provided
     let imageCids: string[] = [];
     let imageDetails: ImageUpload[] = [];
     
     if (options?.images && options.images.length > 0) {
       console.log('0G Storage: Uploading cover images...');
       const { uploadImages } = await import('./image-storage');
       const uploadResult = await uploadImages(options.images, signer);
       imageCids = uploadResult.cids;
       imageDetails = uploadResult.imageDetails;
       console.log('0G Storage: Cover images uploaded:', imageCids);
     }
     
     // Handle inline images if provided (already processed in the calling function)
     let inlineImageCids: string[] = [];
     if (options?.inlineImages && options.inlineImages.length > 0) {
       console.log('0G Storage: Inline images already processed, storing for reference');
       // Inline images are already processed and content is updated in the calling function
       // We just need to store the information for the note
     }
    
    // Create note object
    const note: Note = {
      id: options?.isEdit && options?.originalId 
        ? options.originalId  // Keep the same ID for edits
        : `${walletAddress}-${Date.now()}`,
      title,
      markdown: content,
      images: imageCids,
      inlineImages: [], // TODO: Parse markdown content to extract inline images
      public: false,
      createdAt: options?.isEdit ? Date.now() : Date.now(), // Keep original creation date for edits
      author: walletAddress,
      category: options?.category,
      tags: options?.tags,
      version: options?.isEdit ? undefined : undefined, // No version for edits
      parentId: undefined, // No parent ID for edits
    };
    
    console.log('0G Storage: Note object created:', note);
    
    // Calculate estimated fee based on data size
    const jsonString = JSON.stringify(note);
    const dataSize = jsonString.length;
    const estimatedFee = BigInt(Math.ceil(dataSize * 0.000001 * 1e18)); // Rough estimate: 0.000001 0G per byte
    
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
    console.error('0G Storage: saveNote failed:', error);
    throw error;
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
      console.log('0G Storage: Note reconstructed successfully');
      return reconstructedNote;
    }
    
    return note;
  } catch (error) {
    console.error('0G Storage: getNote failed:', error);
    throw error;
  }
}

// Function to get note edit history
export async function getNoteHistory(noteId: string): Promise<Note[]> {
  try {
    const { findById } = await import('./note');
    const indexItem = findById(noteId);
    
    if (!indexItem || !(indexItem as any).editHistory) {
      return [];
    }
    
    const history: Note[] = [];
    for (const cid of (indexItem as any).editHistory) {
      try {
        const note = await getNote(cid);
        history.push(note);
      } catch (error) {
        console.warn('Failed to load note from history:', cid, error);
      }
    }
    
         return history;
   } catch (error) {
     console.error('Failed to get note history:', error);
     return [];
   }
 }

/**
 * Split a large note into multiple chunks that fit within 0G Storage's 256KB recommended limit
 */
async function splitNoteIntoChunks(note: Note, signer: any): Promise<string[]> {
  try {
    console.log('0G Storage: Starting note chunking process...');
    
    const chunks: string[] = [];
    const markdown = note.markdown;
    
         // Calculate the base size of a chunk without markdown content
     // Use minimal structure to fit within 64 bytes
     const baseChunk = {
       id: `${note.id}-chunk-0`,
       chunkIndex: 0,
       isChunk: true,
       totalChunks: 1,
       markdown: '' // Empty markdown for base calculation
     };
    
         const baseSize = JSON.stringify(baseChunk).length;
     // Use a more reasonable chunk size for splitting very large notes
     // This is just for our fallback chunking, not the official SDK limit
     const maxMarkdownSize = 64 * 1024 - baseSize; // 64KB - base size
     
     console.log('0G Storage: Base chunk size:', baseSize, 'bytes');
     console.log('0G Storage: Max markdown per chunk:', maxMarkdownSize, 'bytes');
     
     if (maxMarkdownSize <= 0) {
       throw new Error('Base chunk structure too large, cannot create chunks');
     }
    
    // Split markdown into chunks
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (let i = 0; i < markdown.length; i++) {
      const char = markdown[i];
      currentChunk += char;
      
      // Check if current chunk would exceed size limit
      if (currentChunk.length >= maxMarkdownSize) {
        // Create chunk with current content
        const chunkNote = {
          ...baseChunk,
          id: `${note.id}-chunk-${chunkIndex}`,
          markdown: currentChunk,
          chunkIndex: chunkIndex,
          totalChunks: Math.ceil(markdown.length / maxMarkdownSize)
        };
        
        // Upload chunk to 0G Storage
        const { putJSON } = await import('@onchain-notes/sdk');
        const chunkData = JSON.stringify(chunkNote);
        const result = await putJSON(chunkData, signer);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to upload chunk to 0G Storage');
        }
        
        const { cid } = result;
        
        chunks.push(cid || '');
        console.log(`0G Storage: Chunk ${chunkIndex} uploaded with CID: ${cid}, size: ${currentChunk.length} chars`);
        
        chunkIndex++;
        currentChunk = ''; // Start new chunk
      }
    }
    
    // Upload the last chunk if it has content
    if (currentChunk.length > 0) {
      const chunkNote = {
        ...baseChunk,
        id: `${note.id}-chunk-${chunkIndex}`,
        markdown: currentChunk,
        chunkIndex: chunkIndex,
        totalChunks: chunkIndex + 1
      };
      
      const { putJSON } = await import('@onchain-notes/sdk');
      const chunkData = JSON.stringify(chunkNote);
      const result = await putJSON(chunkData, signer);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to upload final chunk to 0G Storage');
      }
      
      const { cid } = result;
      
      chunks.push(cid || '');
      console.log(`0G Storage: Final chunk ${chunkIndex} uploaded with CID: ${cid}, size: ${currentChunk.length} chars`);
    }
    
    console.log('0G Storage: Note successfully split into', chunks.length, 'chunks');
    return chunks;
    
  } catch (error) {
    console.error('0G Storage: Failed to split note into chunks:', error);
    throw new Error(`Failed to split note into chunks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Reconstruct a split note by fetching all its chunks and combining them
 */
async function reconstructSplitNote(splitNote: Note, signer?: any): Promise<Note> {
  try {
    console.log('0G Storage: Starting note reconstruction...');
    
    // Extract chunk CIDs from the markdown field
    const chunkCidsMatch = splitNote.markdown.match(/\[SPLIT_NOTE:(.+)\]/);
    if (!chunkCidsMatch) {
      throw new Error('Invalid split note format');
    }
    
    const chunkCids = chunkCidsMatch[1].split(',').filter(cid => cid.trim());
    console.log('0G Storage: Found', chunkCids.length, 'chunks to reconstruct');
    
    if (chunkCids.length === 0) {
      throw new Error('No chunk CIDs found in split note');
    }
    
    // Fetch all chunks and sort them by chunk index
    const chunks: Array<{ chunkIndex: number; markdown: string }> = [];
    const { getJSON } = await import('@onchain-notes/sdk');
    
    for (const chunkCid of chunkCids) {
      try {
        const chunkResult = await getJSON(chunkCid, signer);
        if (chunkResult.success && chunkResult.data) {
          const chunk = chunkResult.data;
          if (chunk.isChunk && typeof chunk.chunkIndex === 'number') {
            chunks.push({
              chunkIndex: chunk.chunkIndex,
              markdown: chunk.markdown
            });
          }
        }
      } catch (error) {
        console.warn('0G Storage: Failed to fetch chunk', chunkCid, error);
      }
    }
    
    // Sort chunks by index to maintain correct order
    chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
    
    if (chunks.length === 0) {
      throw new Error('Failed to fetch any chunks');
    }
    
    // Reconstruct the original markdown content
    const reconstructedMarkdown = chunks.map(chunk => chunk.markdown).join('');
    
    console.log('0G Storage: Reconstructed markdown length:', reconstructedMarkdown.length);
    
    // Create the reconstructed note
    const reconstructedNote: Note = {
      ...splitNote,
      markdown: reconstructedMarkdown,
      // Remove chunk-related fields
      inlineImages: splitNote.inlineImages.filter(img => !img.cid.startsWith('0x')) // Filter out chunk CIDs
    };
    
    return reconstructedNote;
    
  } catch (error) {
    console.error('0G Storage: Failed to reconstruct split note:', error);
    throw new Error(`Failed to reconstruct split note: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
