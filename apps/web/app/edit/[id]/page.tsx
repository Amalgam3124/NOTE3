'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount, useWalletClient } from 'wagmi';
import ReactMarkdown from 'react-markdown';
import LoadingSpinner from '../../../src/components/LoadingSpinner';
import PageLoadingSpinner from '../../../src/components/PageLoadingSpinner';
import OptimizedImage from '../../../src/components/OptimizedImage';
import InlineImageManager from '../../../src/components/InlineImageManager';
import MarkdownPreview from '../../../src/components/MarkdownPreview';
import { findById } from '../../../src/lib/note';
import { getNote } from '../../../src/lib/0g-storage';
// Remove static type imports to avoid SSR issues

// Define types locally to avoid SSR issues
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
  version?: number;
  parentId?: string;
  editHistory?: string[];
};

type NoteIndexItem = {
  id: string;
  title: string;
  cid: string;
  createdAt: number;
  updatedAt?: number;
  public?: boolean;
  category?: string;
  tags?: string[];
  version?: number;
  parentId?: string;
  hasImages?: boolean;
};

interface EditNotePageProps {
  params: {
    id: string;
  };
}

export default function EditNotePage({ params }: EditNotePageProps) {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  
  const [originalNote, setOriginalNote] = useState<Note | null>(null);
  const [indexItem, setIndexItem] = useState<NoteIndexItem | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [inlineImages, setInlineImages] = useState<{ markdown: string; file: File }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Load original note data
  useEffect(() => {
    const loadNoteData = async () => {
      try {
        setIsLoading(true);
        setError('');

        // Wait for wallet client to be available
        if (!walletClient) {
          console.log('Wallet client not ready, waiting...');
          return;
        }

        // Find note in local index
        const foundIndex = findById(params.id);
        if (!foundIndex) {
          setError('Note not found');
          return;
        }

        setIndexItem(foundIndex);

        // Load note content from 0G Storage
        const noteData = await getNote(foundIndex.cid, walletClient);
        setOriginalNote(noteData);

        // Pre-fill form with existing data
        setTitle(noteData.title);
        setContent(noteData.markdown);
        setCategory((noteData as any).category || '');
        setTags((noteData as any).tags || []);
        setExistingImages(noteData.images || []);

        // Load categories
        try {
          const { getCategories } = await import('../../../src/lib/note');
          const cats = getCategories();
          setCategories(cats);
        } catch (error) {
          console.error('Failed to load categories:', error);
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load note');
      } finally {
        setIsLoading(false);
      }
    };

    if (isConnected) {
      loadNoteData();
    }
  }, [params.id, isConnected, walletClient]);

  // Check if user is the author
  const isAuthor = originalNote?.author === address;

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

    if (!isAuthor) {
      setError('You can only edit your own notes');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      let finalContent = content;
      
      // Process inline images: upload to 0G Storage and replace local URLs with CIDs
      if (inlineImages.length > 0) {
        console.log('Processing inline images...');
        const { processInlineImages } = await import('../../../src/lib/inline-image-uploader');
        
        try {
          finalContent = await processInlineImages(finalContent, inlineImages, walletClient);
          console.log('Inline images processed successfully');
        } catch (error) {
          console.error('Failed to process inline images:', error);
          throw new Error(`Failed to process inline images: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Dynamically import the saveNote function to avoid SSR issues
      const { saveNote } = await import('../../../src/lib/0g-storage');
      
      const { note } = await saveNote(
        title.trim(), 
        finalContent.trim(), 
        walletClient,
        {
          category: category.trim() || undefined,
          tags: tags.length > 0 ? tags : undefined,
          images: selectedImages.length > 0 ? selectedImages : undefined,
          isEdit: true,
          originalId: params.id,
        }
      );
      
      // Add new category if it's new
      if (category.trim() && !categories.includes(category.trim())) {
        const { addCategory } = await import('../../../src/lib/note');
        addCategory(category.trim());
      }
      
      // Navigate to the updated note
      router.push(`/note/${params.id}`);
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
  }, [title, content, category, tags, selectedImages, inlineImages, isConnected, walletClient, router, categories, isAuthor, params.id]);

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
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 1;
        target.focus();
      }, 0);
    }
  }, [content]);

  // Handle inline image insertion
  const handleInlineImageInsert = useCallback((markdownSyntax: string, localFile?: File) => {
    const target = document.getElementById('content') as HTMLTextAreaElement;
    if (!target) return;
    
    const start = target.selectionStart;
    const end = target.selectionEnd;
    
    // Insert image markdown at cursor position
    const newContent = content.substring(0, start) + markdownSyntax + content.substring(end);
    setContent(newContent);
    
    // Store the local file for later upload
    if (localFile) {
      setInlineImages(prev => [...prev, { markdown: markdownSyntax, file: localFile }]);
    }
    
    // Set cursor position to after the inserted image
    setTimeout(() => {
      target.selectionStart = target.selectionEnd = start + markdownSyntax.length;
      target.focus();
    }, 0);
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
  if (isLoading) {
    return (
      <PageLoadingSpinner 
        message="Loading Note for Editing" 
        isCompiling={true}
      />
    );
  }

  // Check if user is authorized to edit
  if (!isAuthor) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Access Denied</h1>
          <button
            onClick={handleBack}
            className="text-gray-600 hover:text-gray-800"
          >
            ← Back
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">You can only edit your own notes.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Loading state during saving */}
      {isSaving && (
        <LoadingSpinner 
          message="Updating Note in 0G Storage" 
          showProgress={true}
        />
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Edit Note</h1>
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
              Please connect your wallet to edit notes.
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

        {/* Existing Images */}
        {existingImages.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Existing Images
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                             {existingImages.map((imageCid, index) => (
                 <div key={index} className="relative group">
                   <OptimizedImage
                     src={`https://gateway.0g.ai/ipfs/${imageCid}`}
                     alt={`Existing Image ${index + 1}`}
                     width={96}
                     height={96}
                     className="w-full h-24 object-cover rounded-lg border border-gray-200"
                     fallbackSrc="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik02MCAxMDBDNjAgODguOTU0MyA2OC45NTQzIDgwIDgwIDgwQzkxLjA0NTcgODAgMTAwIDg4Ljk1NDMgMTAwIDEwMEMxMDAgMTExLjA0NiA5MS4wNDU3IDEyMCA4MCAxMjBDNjguOTU0MyAxMjAgNjAgMTExLjA0NiA2MCAxMDBaIiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik0xMDAgMTQwTDEyMCAxMjBMMTQwIDE0MEgxMDBaIiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik02MCAxNDBMMTgwIDE0MEg2MFoiIGZpbGw9IiM5QjlCQTAiLz4KPC9zdmc+"
                   />
                   <p className="text-xs text-gray-500 mt-1 truncate font-mono">{imageCid ? `${imageCid.slice(0, 10)}...` : 'No CID'}</p>
                 </div>
               ))}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              💡 These images are already uploaded. You can reference them in your content using <code className="bg-gray-100 px-1 rounded">![alt]({existingImages[0]})</code>
            </p>
          </div>
        )}

                {/* New Cover Images */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add New Cover Images
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
                <p className="text-lg">📷 Drag and drop new cover images here</p>
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
              <h4 className="text-sm font-medium text-gray-700 mb-2">New Cover Images to Upload:</h4>
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
          existingImages={[...existingImages, ...selectedImages.map(file => URL.createObjectURL(file))]}
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
                placeholder="Edit your Markdown content here... Use ![alt](image-cid) to reference images"
                className="w-full min-h-[500px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white resize-none font-mono text-sm"
                style={{
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word'
                }}
              />
              
              {/* Edit hint */}
              <div className="text-xs text-gray-500">
                <p>💡 <strong>Editing Tips:</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Reference existing images: <code className="bg-gray-100 px-1 rounded">![alt]({existingImages[0] || 'image-cid'})</code></li>
                  <li>New images will be uploaded and their CIDs will be available</li>
                  <li>All Markdown syntax is supported</li>
                  <li>Tab key support for indentation</li>
                </ul>
              </div>
            </div>
            
                         {/* Right: Real-time preview */}
             <div className="space-y-2">
               <div className="text-sm text-gray-600 mb-2">👁️ Live Preview</div>
               <div className="w-full min-h-[500px] px-3 py-2 border border-gray-2 rounded-lg bg-white overflow-y-auto">
                 {content.trim() ? (
                   <MarkdownPreview content={content} />
                 ) : (
                   <div className="text-gray-400 text-center py-8">
                     <p>Edit content in the left panel to see live preview here</p>
                     <p className="text-sm mt-2">Supports Markdown syntax and inline images</p>
                   </div>
                 )}
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
            {isSaving ? 'Updating...' : 'Update Note'}
          </button>
        </div>
      </div>
    </>
  );
}
