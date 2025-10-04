'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useWalletClient } from 'wagmi';
import ReactMarkdown from 'react-markdown';
import LoadingSpinner from '../../src/components/LoadingSpinner';
import PageLoadingSpinner from '../../src/components/PageLoadingSpinner';
import OptimizedImage from '../../src/components/OptimizedImage';
import InlineImageManager from '../../src/components/InlineImageManager';
import MarkdownPreview from '../../src/components/MarkdownPreview';
// Remove static type import to avoid SSR issues
// import type { Note } from '@onchain-notes/types';

// Extended Note type with CID - Define locally to avoid SSR issues
type Note = {
  id: string;
  title: string;
  markdown: string;
  images: string[];
  public: boolean;
  createdAt: number;
  author: string;
  category?: string;
  tags?: string[];
};

type NoteWithCID = Note & { cid?: string };

export default function NewNotePage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  
  // Check if we're on the client side
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [inlineImages, setInlineImages] = useState<{ markdown: string; file: File }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Page loading state
  useEffect(() => {
    // Simulate page loading process
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 2000); // Hide loading state after 2 seconds

    return () => clearTimeout(timer);
  }, []);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { getCategories } = await import('../../src/lib/note');
        const cats = getCategories();
        setCategories(cats);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };
    
    if (isConnected) {
      loadCategories();
    }
  }, [isConnected]);

  // Use useCallback to optimize functions
  const handleSave = useCallback(async () => {
    if (!title.trim() || !content.trim()) {
      setError('Please fill in both title and content');
      return;
    }

    if (!isConnected || !walletClient) {
      setError('Please connect your wallet first');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      // Process inline images: upload to 0G Storage and replace local URLs with CIDs
      console.log('🔍 handleSave: inlineImages state:', inlineImages.length, 'items');
      console.log('🔍 handleSave: inlineImages details:', inlineImages);
      
      let finalContent = content;
      let processedInlineImages: Array<{ markdown: string; file: File }> = [];
      
      if (inlineImages.length > 0) {
        console.log('🔍 Processing inline images...');
        const { processInlineImages } = await import('../../src/lib/inline-image-uploader');
        
        try {
          finalContent = await processInlineImages(finalContent, inlineImages, walletClient);
          processedInlineImages = inlineImages; // Pass the original inline images for tracking
          console.log('🔍 Inline images processed successfully');
        } catch (error) {
          console.error('❌ Failed to process inline images:', error);
          throw new Error(`Failed to process inline images: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        console.log('🔍 No inline images to process');
      }
      
      // Dynamically import the saveNote function to avoid SSR issues
      const { saveNote } = await import('../../src/lib/0g-storage');
      
      const { note } = await saveNote(
        title.trim(), 
        finalContent.trim(), 
        walletClient,
        {
          category: category.trim() || undefined,
          tags: tags.length > 0 ? tags : undefined,
          images: selectedImages.length > 0 ? selectedImages : undefined,
          inlineImages: processedInlineImages,
        }
      );
      
      // Add new category if it's new
      if (category.trim() && !categories.includes(category.trim())) {
        const { addCategory } = await import('../../src/lib/note');
        addCategory(category.trim());
        setCategories(prev => [...prev, category.trim()]);
      }
      
      router.push(`/note/${note.id}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save note';
      
      // Check if it's insufficient balance error
      if (errorMessage.includes('insufficient funds') || errorMessage.includes('insufficient balance')) {
        setError(`Insufficient balance! Please get testnet 0G tokens from https://faucet.0g.ai/. Error details: ${errorMessage}`);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsSaving(false);
    }
  }, [title, content, category, tags, selectedImages, inlineImages, isConnected, walletClient, router, categories]);

  // Use useCallback to optimize input handling
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  }, []);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  }, []);

  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCategory(e.target.value);
  }, []);

  const handleTagInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value);
  }, []);

  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags(prev => [...prev, tag]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  }, [handleAddTag]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // Handle tab key input in content
  const handleContentKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      
      // Insert tab character at cursor position
      const newContent = content.substring(0, start) + '\t' + content.substring(end);
      setContent(newContent);
      
      // Set cursor position to after the tab
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = start + 1;
          target.focus();
        }, 0);
      }
    }
  }, [content]);

  // Handle inline image insertion
  const handleInlineImageInsert = useCallback((markdownSyntax: string, localFile?: File) => {
    console.log('🔍 handleInlineImageInsert called with:', { markdownSyntax, localFile });
    
    // Check if we're on the client side
    if (typeof document === 'undefined') {
      console.error('❌ Document not available (SSR)');
      return;
    }
    
    const target = document.getElementById('content') as HTMLTextAreaElement;
    if (!target) {
      console.error('❌ Content textarea not found');
      return;
    }
    
    const start = target.selectionStart;
    const end = target.selectionEnd;
    
    console.log('🔍 Cursor position:', { start, end });
    
    // Insert image markdown at cursor position
    const newContent = content.substring(0, start) + markdownSyntax + content.substring(end);
    setContent(newContent);
    
    // Store the local file for later upload
    if (localFile) {
      console.log('🔍 Storing local file for upload:', localFile.name, localFile.size);
      setInlineImages(prev => {
        const newInlineImages = [...prev, { markdown: markdownSyntax, file: localFile }];
        console.log('🔍 Updated inlineImages state:', newInlineImages.length, 'items');
        return newInlineImages;
      });
    } else {
      console.warn('⚠️ No local file provided for inline image');
    }
    
    // Set cursor position to after the inserted image
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + markdownSyntax.length;
        target.focus();
      }, 0);
    }
  }, [content]);

  // Image handling functions
  const handleImageSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    
    const newImages: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        newImages.push(file);
      }
    }
    
    setSelectedImages(prev => [...prev, ...newImages]);
  }, []);

  const handleRemoveImage = useCallback((index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    handleImageSelect(files);
  }, [handleImageSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Real-time editing content with image support
  const renderContent = useMemo(() => {
    if (!content.trim()) {
      return (
        <div className="text-gray-400 text-center py-8">
          <p>Start typing to see your content rendered in real-time</p>
          <p className="text-sm mt-2">Supports Markdown syntax and images</p>
        </div>
      );
    }

    return (
      <div className="prose max-w-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }, [content]);

  // If page is still loading, show loading state
  // Show loading state during SSR
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <PageLoadingSpinner />
      </div>
    );
  }

  if (isPageLoading) {
    return (
      <PageLoadingSpinner 
        message="Preparing Markdown Editor" 
        isCompiling={true}
      />
    );
  }

  return (
    <>
      {/* Loading state during saving */}
      {isSaving && (
        <LoadingSpinner 
          message="Saving to 0G Storage" 
          showProgress={true}
        />
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">New Note</h1>
          <button
            onClick={handleBack}
            className="text-gray-600 hover:text-gray-800"
          >
            ← Back
          </button>
        </div>

        {!isConnected && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              Please connect your wallet to create notes.
            </p>
          </div>
        )}

        {/* Title input */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={handleTitleChange}
            placeholder="Enter note title..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={!isConnected}
          />
        </div>

        {/* Category and Tags */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <input
              type="text"
              id="category"
              value={category}
              onChange={handleCategoryChange}
              placeholder="Enter category..."
              list="categories"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!isConnected}
            />
            <datalist id="categories">
              {categories.map(cat => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex">
              <input
                type="text"
                id="tags"
                value={tagInput}
                onChange={handleTagInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Add tag and press Enter..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!isConnected}
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                disabled={!isConnected || !tagInput.trim()}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Cover Images (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cover Images (Optional)
          </label>
          <p className="text-sm text-gray-600 mb-3">
            These images will be displayed as attachments/cover images for your note.
          </p>
          <div
            ref={dropZoneRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors"
          >
            <div className="space-y-4">
              <div className="text-gray-600">
                <p className="text-lg">📷 Drag and drop cover images here</p>
                <p className="text-sm">or</p>
                <button
                  type="button"
                  onClick={openFileDialog}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                  disabled={!isConnected}
                >
                  Browse Files
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Supported formats: JPG, PNG, GIF, WebP (max 10MB each)
              </p>
            </div>
          </div>
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleImageSelect(e.target.files)}
            className="hidden"
          />
          
          {/* Selected images preview */}
          {selectedImages.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Cover Images:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {selectedImages.map((file, index) => (
                  <div key={index} className="relative group">
                    <OptimizedImage
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      width={96}
                      height={96}
                      className="w-full h-24 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm"
                    >
                      ×
                    </button>
                    <p className="text-xs text-gray-600 mt-1 truncate">{file.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Inline Image Manager */}
        <InlineImageManager
          onImageInsert={handleInlineImageInsert}
          existingImages={selectedImages.map(file => URL.createObjectURL(file))}
          isConnected={isConnected}
        />

        {/* Real-time Markdown editor */}
        <div className="space-y-2">
          <label htmlFor="content" className="block text-sm font-medium text-gray-700">
            Content (Markdown) - Real-time Preview
          </label>
          
          {/* Split editor: left input, right preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Markdown input */}
            <div className="space-y-2">
              <div className="text-sm text-gray-600 mb-2">📝 Input (Markdown)</div>
              <textarea
                id="content"
                value={content}
                onChange={handleContentChange}
                onKeyDown={handleContentKeyDown}
                placeholder="Start typing your Markdown content here... Use ![alt](image-cid) to reference uploaded images"
                className="w-full min-h-[500px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white resize-none font-mono text-sm"
                style={{
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word'
                }}
              />
              
              {/* Edit hint */}
              <div className="text-xs text-gray-500">
                <p>💡 <strong>Markdown Syntax Support:</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><code className="bg-gray-100 px-1 rounded">#</code> Headings</li>
                  <li><code className="bg-gray-100 px-1 rounded">**Bold**</code> and <code className="bg-gray-100 px-1 rounded">*Italic*</code></li>
                  <li><code className="bg-gray-100 px-1 rounded">[Link](URL)</code> and <code className="bg-gray-100 px-1 rounded">![Image](URL)</code></li>
                  <li><code className="bg-gray-100 px-1 rounded">- List item</code> and <code className="bg-gray-100 px-1 rounded">1. Ordered list</code></li>
                  <li><code className="bg-gray-100 px-1 rounded">`Code`</code> and <code className="bg-gray-100 px-1 rounded">```Code block```</code></li>
                  <li><code className="bg-gray-100 px-1 rounded">Tab</code> key support</li>
                  <li><code className="bg-gray-100 px-1 rounded">![alt](image-cid)</code> for uploaded images</li>
                </ul>
              </div>
            </div>
            
                         {/* Right: Real-time preview */}
             <div className="space-y-2">
               <div className="text-sm text-gray-600 mb-2">👁️ Live Preview</div>
               <div className="w-full min-h-[500px] px-3 py-2 border border-gray-300 rounded-lg bg-white overflow-y-auto">
                 {content.trim() ? (
                   <MarkdownPreview content={content} />
                 ) : (
                   <div className="text-gray-400 text-center py-8">
                     <p>Start typing in the left panel to see live preview here</p>
                     <p className="text-sm mt-2">Supports Markdown syntax and inline images</p>
                   </div>
                 )}
               </div>
              
              {/* Preview hint */}
              <div className="text-xs text-gray-500">
                <p>✨ <strong>Real-time Preview Features:</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Left panel input, right panel live rendering</li>
                  <li>Supports all standard Markdown syntax</li>
                  <li>Image support with CID references</li>
                  <li>What You See Is What You Get editing experience</li>
                  <li>Tab key input support</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={handleBack}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isConnected || isSaving}
            className={`px-6 py-2 rounded-lg transition-colors ${
              !isConnected
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : isSaving
                ? 'bg-blue-400 text-white cursor-wait'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            title={
              !isConnected
                ? 'Please connect your wallet first'
                : ''
            }
          >
            {isSaving ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </div>
    </>
  );
}
