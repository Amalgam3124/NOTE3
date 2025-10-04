

// Inline image uploader for 0G Storage
// Handles uploading inline images and replacing local URLs with CIDs

export interface InlineImageData {
  markdown: string;
  file: File;
}

export interface UploadedImageResult {
  originalMarkdown: string;
  cid: string;
  gatewayUrl: string;
}

/**
 * Upload inline images to 0G Storage and return mapping for replacement
 */
export async function uploadInlineImages(
  inlineImages: InlineImageData[],
  signer: any
): Promise<UploadedImageResult[]> {
  if (inlineImages.length === 0) {
    return [];
  }

  console.log(`Starting to upload ${inlineImages.length} inline images...`);
  const results: UploadedImageResult[] = [];

  try {
    // Dynamically import putFile to avoid SSR issues (exact same as image-storage.ts)
    const { putFile } = await import('@onchain-notes/sdk');

    for (const imageData of inlineImages) {
      try {
        console.log(`Uploading inline image: ${imageData.file.name}`);
        
        // Validate file type (copying validation from image-storage.ts)
        if (!imageData.file.type.startsWith('image/')) {
          console.warn('Inline Image Uploader: Skipping non-image file:', imageData.file.name);
          continue;
        }
        
        // Validate file size (max 10MB) - same as image-storage.ts
        if (imageData.file.size > 10 * 1024 * 1024) {
          console.warn('Inline Image Uploader: Image too large, skipping:', imageData.file.name);
          continue;
        }
        
        // Upload file to 0G Storage (exact same call as image-storage.ts)
        const { cid } = await putFile(imageData.file, signer);
        console.log(`Inline image uploaded successfully with CID: ${cid}`);
        
        // Create gateway URL
        const gatewayUrl = `https://gateway.0g.ai/ipfs/${cid}`;
        
        // Store result for replacement
        results.push({
          originalMarkdown: imageData.markdown,
          cid,
          gatewayUrl
        });
        
      } catch (error) {
        console.error(`Failed to upload inline image ${imageData.file.name}:`, error);
        // Continue with other images (same behavior as image-storage.ts)
        console.warn(`Skipping failed image: ${imageData.file.name}`);
      }
    }

    console.log(`Successfully uploaded ${results.length} inline images`);
    return results;

  } catch (error) {
    console.error('Inline image upload failed:', error);
    throw error;
  }
}

/**
 * Replace local blob URLs in markdown content with uploaded image CIDs
 */
export function replaceLocalUrlsWithCids(
  content: string,
  uploadedImages: UploadedImageResult[]
): string {
  let finalContent = content;

  for (const imageResult of uploadedImages) {
    // Extract alt text from original markdown
    const altMatch = imageResult.originalMarkdown.match(/!\[([^\]]+)\]/);
    const altText = altMatch ? altMatch[1] : 'Image';
    
    // Create new markdown with CID
    const newMarkdown = `![${altText}](https://gateway.0g.ai/ipfs/${imageResult.cid})`;
    
    // Find and replace any blob URL for this image
    // Use a more flexible regex to find the image markdown with any blob URL
    const blobUrlRegex = new RegExp(`!\\[${altText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\(blob:[^)]+\\)`, 'g');
    
    if (blobUrlRegex.test(finalContent)) {
      // Replace all occurrences of this image with blob URLs
      finalContent = finalContent.replace(blobUrlRegex, newMarkdown);
      console.log(`Replaced blob URL with CID: ${imageResult.cid} for image: ${altText}`);
    } else {
      // Fallback: try to replace the exact original markdown
      if (finalContent.includes(imageResult.originalMarkdown)) {
        finalContent = finalContent.replace(imageResult.originalMarkdown, newMarkdown);
        console.log(`Replaced original markdown with CID: ${imageResult.cid} for image: ${altText}`);
      } else {
        console.warn(`Could not find image markdown to replace for: ${altText}`);
        console.log('Original markdown:', imageResult.originalMarkdown);
        console.log('Current content preview:', finalContent.substring(0, 200) + '...');
      }
    }
  }

  return finalContent;
}

/**
 * Main function to process inline images: upload and replace URLs
 */
export async function processInlineImages(
  content: string,
  inlineImages: InlineImageData[],
  signer: any
): Promise<string> {
  if (inlineImages.length === 0) {
    console.log('No inline images to process');
    return content;
  }

  try {
    // Step 1: Upload all inline images
    const uploadedImages = await uploadInlineImages(inlineImages, signer);
    
    // Step 2: Replace local URLs with CIDs in content
    const finalContent = replaceLocalUrlsWithCids(content, uploadedImages);
    
    console.log('Inline images processed successfully');
    return finalContent;
    
  } catch (error) {
    console.error('Failed to process inline images:', error);
    throw error;
  }
}
