'use client';

import { useState, useRef, useCallback } from 'react';
import OptimizedImage from './OptimizedImage';

interface InlineImageManagerProps {
  onImageInsert: (markdownSyntax: string, localFile?: File) => void;
  existingImages: string[];
  isConnected: boolean;
}

export default function InlineImageManager({ 
  onImageInsert, 
  existingImages, 
  isConnected
}: InlineImageManagerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [altText, setAltText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedCid, setUploadedCid] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (file.type.startsWith('image/')) {
      setSelectedFile(file);
      setAltText(file.name.replace(/\.[^/.]+$/, '')); // Use filename without extension as default alt
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !altText.trim()) return;

    setIsUploading(true);
    try {
      // Create a local blob URL for preview
      const localUrl = URL.createObjectURL(selectedFile);
      
      // Create markdown syntax with local URL for now
      const markdownSyntax = `![${altText.trim()}](${localUrl})`;
      
      // Pass both markdown syntax and local file to parent
      onImageInsert(markdownSyntax, selectedFile);
      
      // Reset form
      setSelectedFile(null);
      setAltText('');
      setUploadedCid('');
    } catch (error) {
      console.error('Failed to process image:', error);
      alert('Failed to process image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, altText, onImageInsert]);

  const handleExistingImageInsert = useCallback((cid: string, filename: string) => {
    const markdownSyntax = `![${filename}](${cid})`;
    onImageInsert(markdownSyntax);
  }, [onImageInsert]);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <h3 className="text-lg font-medium text-gray-900 mb-4">📷 Insert Image into Markdown</h3>
      
      {/* Upload new image */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload New Image
          </label>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={openFileDialog}
              disabled={!isConnected}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Choose Image
            </button>
            <span className="text-sm text-gray-500">
              {selectedFile ? selectedFile.name : 'No file selected'}
            </span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
        </div>

        {selectedFile && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alt Text (for accessibility)
              </label>
              <input
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Describe the image..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-20 h-20 relative">
                <OptimizedImage
                  src={URL.createObjectURL(selectedFile)}
                  alt={altText || selectedFile.name}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover rounded-lg border border-gray-200"
                />
              </div>
              <button
                onClick={handleUpload}
                disabled={!altText.trim() || isUploading || !isConnected}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Uploading...' : 'Insert into Markdown'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Existing images */}
      {existingImages.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Insert Existing Image
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {existingImages.map((cid, index) => (
              <div key={index} className="relative group">
                <OptimizedImage
                  src={`https://gateway.0g.ai/ipfs/${cid}`}
                  alt={`Image ${index + 1}`}
                  width={80}
                  height={80}
                  className="w-full h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:border-blue-400 transition-colors"
                  fallbackSrc="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik02MCAxMDBDNjAgODguOTU0MyA2OC45NTQzIDgwIDgwIDgwQzkxLjA0NTcgODAgMTAwIDg4Ljk1NDMgMTAwIDEwMEMxMDAgMTExLjA0NiA5MS4wNDU3IDEyMCA4MCAxMjBDNjguOTU0MyAxMjAgNjAgMTExLjA0NiA2MCAxMDBaIiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik0xMDAgMTQwTDEyMCAxMjBMMTQwIDE0MEgxMDBaIiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik02MCAxNDBMMTgwIDE0MEg2MFoiIGZpbGw9IiM5QjlCQTAiLz4KPC9zdmc+"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                  <button
                    onClick={() => handleExistingImageInsert(cid, `Image ${index + 1}`)}
                    className="opacity-0 group-hover:opacity-100 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium transition-opacity"
                  >
                    Insert
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1 truncate font-mono">{cid ? `${cid.slice(0, 8)}...` : 'No CID'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help text */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          💡 <strong>How to use:</strong> Upload a new image or select an existing one to insert it into your Markdown content. 
          The image will be inserted at your cursor position in the editor.
        </p>
      </div>
    </div>
  );
}
