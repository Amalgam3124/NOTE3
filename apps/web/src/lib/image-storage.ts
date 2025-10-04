// Image storage module for 0G Storage
// Define types locally to avoid SSR issues
type ImageUpload = {
  cid: string;
  name: string;
  filename: string;
  size: number;
  type: string;
  mimeType: string;
  uploadedAt: number;
  author: `0x${string}`;
  markdown: string;
};

export interface ImageUploadResult {
  cids: string[];
  imageDetails: ImageUpload[];
}

// Upload multiple images to 0G Storage
export async function uploadImages(
  files: File[], 
  signer: any
): Promise<ImageUploadResult> {
  try {
    console.log('Image Storage: Starting upload of', files.length, 'images');
    
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
      console.error('Image Storage: Failed to get wallet address:', error);
      throw new Error('Failed to get wallet address from signer');
    }
    
    const cids: string[] = [];
    const imageDetails: ImageUpload[] = [];
    
    // Upload each image individually
    for (const file of files) {
      try {
        console.log('Image Storage: Uploading image:', file.name);
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          console.warn('Image Storage: Skipping non-image file:', file.name);
          continue;
        }
        
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          console.warn('Image Storage: Image too large, skipping:', file.name);
          continue;
        }
        
        // Create image metadata
        const imageMetadata: ImageUpload = {
          cid: '', // Will be set after upload
          name: file.name,
          filename: file.name,
          size: file.size,
          type: file.type,
          mimeType: file.type,
          uploadedAt: Date.now(),
          author: walletAddress,
          markdown: `![${file.name}](cid:${file.name})`,
        };
        
        // Dynamically import SDK to avoid SSR issues
        const { putFile } = await import('@onchain-notes/sdk');
        
        // Upload image file
        const { cid } = await putFile(file, signer);
        
        // Update metadata with CID
        imageMetadata.cid = cid;
        
        cids.push(cid);
        imageDetails.push(imageMetadata);
        
        console.log('Image Storage: Image uploaded successfully:', {
          filename: file.name,
          cid,
          size: file.size
        });
        
      } catch (error) {
        console.error('Image Storage: Failed to upload image:', file.name, error);
        // Continue with other images
      }
    }
    
    console.log('Image Storage: Upload completed. Successfully uploaded:', cids.length, 'images');
    
    return { cids, imageDetails };
  } catch (error) {
    console.error('Image Storage: uploadImages failed:', error);
    throw error;
  }
}

// Get image from 0G Storage
export async function getImage(cid: string, signer?: any): Promise<Blob> {
  try {
    console.log('Image Storage: Fetching image with CID:', cid);
    
    // Dynamically import SDK to avoid SSR issues
    const { getFile } = await import('@onchain-notes/sdk');
    
    const result = await getFile(cid, signer);
    
    if (!result) {
      throw new Error('Image not found');
    }
    
    console.log('Image Storage: Image fetched successfully');
    
    return result;
  } catch (error) {
    console.error('Image Storage: getImage failed:', error);
    throw error;
  }
}

// Get image URL for display
export function getImageUrl(cid: string): string {
  // For now, return a placeholder or use a gateway
  // In the future, this could use IPFS gateways or other methods
  return `https://gateway.0g.ai/ipfs/${cid}`;
}

// Validate image file
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: 'File must be an image' };
  }
  
  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { isValid: false, error: 'Image size must be less than 10MB' };
  }
  
  // Check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  
  if (!allowedExtensions.includes(fileExtension)) {
    return { isValid: false, error: 'Only JPG, PNG, GIF, and WebP images are supported' };
  }
  
  return { isValid: true };
}
