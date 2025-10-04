'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { useAccount, useWalletClient } from 'wagmi';
import LoadingSpinner from '../../../src/components/LoadingSpinner';
import PageLoadingSpinner from '../../../src/components/PageLoadingSpinner';
import OptimizedImage from '../../../src/components/OptimizedImage';
import dynamic from 'next/dynamic';

const INFTConverter = dynamic(() => import('../../../src/components/INFTConverter'), {
  ssr: false,
  loading: () => <LoadingSpinner />
});
import { findById } from '../../../src/lib/note';
import { getNote, getNoteHistory } from '../../../src/lib/0g-storage';
// Define types locally to avoid SSR issues
type Note = {
  id: string;
  title: string;
  markdown: string;
  images: string[];
  inlineImages: Array<{
    cid: string;
    name: string;
    size: number;
    type: string;
    markdown: string;
  }>;
  public: boolean;
  createdAt: number;
  author: `0x${string}`;
  category?: string;
  tags?: string[];
  version?: number;
  parentId?: string;
};

type NoteIndexItem = {
  id: string;
  title: string;
  cid: string;
  createdAt: number;
  updatedAt?: number;
  public: boolean;
  category?: string;
  tags?: string[];
  version?: number;
  parentId?: string;
  hasImages?: boolean;
};


interface NotePageProps {
  params: {
    id: string;
  };
}

export default function NotePage({ params }: NotePageProps) {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [note, setNote] = useState<Note | null>(null);
  const [indexItem, setIndexItem] = useState<NoteIndexItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [editHistory, setEditHistory] = useState<Note[]>([]);
  const [showINFTConverter, setShowINFTConverter] = useState(false);

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

        // First try to find note in local index
        let foundIndex = findById(params.id);
        
        if (!foundIndex) {
          // If not found in local index, try to load directly from 0G Storage
          // This happens when a note was just uploaded and hasn't been indexed yet
          console.log('Note not found in local index, attempting to load from 0G Storage...');
          
          try {
            // For newly uploaded notes, the ID might be the transaction hash
            // Try to load the note directly using the ID as CID
            const noteData = await getNote(params.id, walletClient);
            
            // If successful, create a local index item
            const newIndexItem: NoteIndexItem = {
              id: noteData.id,
              title: noteData.title,
              cid: params.id, // Use the ID as CID (transaction hash)
              createdAt: noteData.createdAt,
              public: noteData.public,
              category: (noteData as any).category,
              tags: (noteData as any).tags,
              version: (noteData as any).version,
              parentId: (noteData as any).parentId,
              hasImages: noteData.images.length > 0
            };
            
            // TODO: Add to local index for future access
            // For now, we'll just use it in memory
            console.log('Created local index item:', newIndexItem);
            
            setIndexItem(newIndexItem);
            setNote(noteData);
            console.log('Note loaded directly from 0G Storage');
            return;
          } catch (storageError) {
            console.log('Failed to load from 0G Storage:', storageError);
            
            // If the ID is not a valid CID, try to find by note ID in the format "walletAddress-timestamp"
            if (params.id.includes('-')) {
              try {
                // Try to find notes with similar ID pattern in local storage
                const allNotes = JSON.parse(localStorage.getItem('notes') || '[]');
                const matchingNote = allNotes.find((n: any) => n.id === params.id);
                
                if (matchingNote) {
                  console.log('Found note in local storage:', matchingNote);
                  setIndexItem(matchingNote);
                  setNote(matchingNote);
                  return;
                }
              } catch (localError) {
                console.log('Failed to check local storage:', localError);
              }
            }
            
            setError('Note not found in local index or 0G Storage. The note may not exist or the ID is invalid.');
            return;
          }
        }
        
        // If found in local index, load from 0G Storage using the CID
        setIndexItem(foundIndex);
        const noteData = await getNote(foundIndex.cid, walletClient);
        setNote(noteData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load note');
      } finally {
        setIsLoading(false);
      }
    };

    loadNoteData();
  }, [params.id, walletClient]);

  // Load edit history when requested
  useEffect(() => {
    if (showHistory && indexItem) {
      const loadHistory = async () => {
        try {
          const history = await getNoteHistory(indexItem.id);
          setEditHistory(history);
        } catch (error) {
          console.error('Failed to load edit history:', error);
        }
      };
      loadHistory();
    }
  }, [showHistory, indexItem]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleEdit = () => {
    if (note) {
      // Navigate to edit page with note data
      router.push(`/edit/${note.id}`);
    }
  };

  const handleShowHistory = () => {
    setShowHistory(!showHistory);
  };

  const handleShowINFTConverter = () => {
    setShowINFTConverter(!showINFTConverter);
  };

  const handleINFTConversionComplete = (result: any) => {
    console.log('INFT conversion completed:', result);
    setShowINFTConverter(false);
    // You could show a success message here
  };

  const handleINFTError = (error: string) => {
    console.error('INFT conversion error:', error);
    setError(error);
  };

  const isAuthor = note?.author === address;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">Loading note...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Error</h1>
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-800"
          >
            ← Back
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!note || !indexItem) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Note not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">{note.title}</h1>
        <div className="flex items-center space-x-4">
          {isAuthor && (
            <>
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Note
              </button>
              <button
                onClick={handleShowINFTConverter}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                🤖 Convert to INFT
              </button>
            </>
          )}
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-800"
          >
            ← Back
          </button>
        </div>
      </div>

      {/* Category and Tags */}
      {(note.category || note.tags?.length) && (
        <div className="flex flex-wrap gap-2">
          {note.category && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              📁 {note.category}
            </span>
          )}
          {note.tags?.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Note content */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="prose max-w-none">
          <ReactMarkdown>{note.markdown}</ReactMarkdown>
        </div>
      </div>

      {/* Images section */}
      {note.images && note.images.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📷 Images</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {note.images.map((imageCid, index) => (
              <div key={index} className="space-y-2">
                <OptimizedImage
                  src={`https://gateway.0g.ai/ipfs/${imageCid}`}
                  alt={`Image ${index + 1}`}
                  width={400}
                  height={192}
                  className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  fallbackSrc="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik02MCAxMDBDNjAgODguOTU0MyA2OC45NTQzIDgwIDgwIDgwQzkxLjA0NTcgODAgMTAwIDg4Ljk1NDMgMTAwIDEwMEMxMDAgMTExLjA0NiA5MS4wNDU3IDEyMCA4MCAxMjBDNjguOTU0MyAxMjAgNjAgMTExLjA0NiA2MCAxMDBaIiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik0xMDAgMTQwTDEyMCAxMjBMMTQwIDE0MEgxMDBaIiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik02MCAxNDBMMTgwIDE0MEg2MFoiIGZpbGw9IiM5QjlCQTAiLz4KPC9zdmc+"
                />
                <p className="text-xs text-gray-500 font-mono break-all">{imageCid}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit history */}
      {(indexItem as any).editHistory && (indexItem as any).editHistory.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">📝 Edit History</h3>
            <button
              onClick={handleShowHistory}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              {showHistory ? 'Hide History' : 'Show History'}
            </button>
          </div>
          
          {showHistory && (
            <div className="space-y-3">
              {editHistory.map((historyNote, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Version {editHistory.length - index}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(historyNote.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {(historyNote as any).markdown?.substring(0, 100) || 'Content not available'}...
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* INFT Converter */}
      {showINFTConverter && note && (
        <INFTConverter
          note={note}
          onConversionComplete={handleINFTConversionComplete}
          onError={handleINFTError}
        />
      )}

      {/* Note metadata */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <span className="font-medium">Author:</span>
            <span className="ml-2 font-mono">{note.author}</span>
          </div>
          <div>
            <span className="font-medium">Created:</span>
            <span className="ml-2">{formatDate(note.createdAt)}</span>
          </div>
          {indexItem.updatedAt && (
            <div>
              <span className="font-medium">Updated:</span>
              <span className="ml-2">{formatDate(indexItem.updatedAt)}</span>
            </div>
          )}
          <div>
            <span className="font-medium">CID:</span>
            <span className="ml-2 font-mono text-xs">{indexItem.cid}</span>
          </div>
          <div>
            <span className="font-medium">Note ID:</span>
            <span className="ml-2 font-mono text-xs">{note.id}</span>
          </div>
          {indexItem.version && (
            <div>
              <span className="font-medium">Version:</span>
              <span className="ml-2">{indexItem.version}</span>
            </div>
          )}
          {note.images && note.images.length > 0 && (
            <div>
              <span className="font-medium">Images:</span>
              <span className="ml-2">{note.images.length}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
