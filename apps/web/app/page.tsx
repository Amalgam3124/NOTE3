'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import LoadingSpinner from '../src/components/LoadingSpinner';
import { getLocalIndex, getCategories, getNotesByCategory, getNotesByTag, searchNotes } from '../src/lib/note';
// Remove static type import to avoid SSR issues
// import type { NoteIndexItem } from '@onchain-notes/types';

// Define type locally to avoid SSR issues
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

export default function HomePage() {
  const { isConnected } = useAccount();
  const [notes, setNotes] = useState<NoteIndexItem[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<NoteIndexItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    setMounted(true);
    
    // Get notes from local index
    const localNotes = getLocalIndex();
    
    // Also get notes from 0G Storage local cache
    let allNotes = [...localNotes];
    
    if (typeof window !== 'undefined') {
      try {
        // Scan localStorage for 0G Storage notes
        const keys = Object.keys(localStorage);
        const ogNoteKeys = keys.filter(key => key.startsWith('0g-note-'));
        
        ogNoteKeys.forEach(key => {
          try {
            const cid = key.replace('0g-note-', '');
            const noteData = JSON.parse(localStorage.getItem(key) || '{}');
            
            // Create index item for 0G Storage note
            const ogNote: NoteIndexItem = {
              id: noteData.id || `og-${cid}`,
              title: noteData.title || 'Untitled Note',
              cid: cid,
              createdAt: noteData.createdAt || Date.now(),
              public: noteData.public || false,
              category: noteData.category,
              tags: noteData.tags,
              version: noteData.version,
              parentId: noteData.parentId,
              hasImages: noteData.hasImages
            };
            
            // Check if this note is already in local index
            const existingIndex = allNotes.findIndex(n => n.id === ogNote.id);
            if (existingIndex >= 0) {
              // Update existing note
              allNotes[existingIndex] = { ...allNotes[existingIndex], ...ogNote };
            } else {
              // Add new note
              allNotes.push(ogNote);
            }
          } catch (parseError) {
            console.warn('Failed to parse 0G Storage note:', parseError);
          }
        });
        
        console.log('Found notes:', {
          localIndex: localNotes.length,
          ogStorage: ogNoteKeys.length,
          total: allNotes.length
        });
      } catch (error) {
        console.error('Failed to scan 0G Storage notes:', error);
      }
    }
    
    // Sort notes by creation date (newest first)
    allNotes.sort((a, b) => b.createdAt - a.createdAt);
    
    setNotes(allNotes);
    setFilteredNotes(allNotes);
    
    // Load categories
    const cats = getCategories();
    setCategories(cats);
  }, []);

  // Apply filters when they change
  useEffect(() => {
    let filtered = [...notes];
    
    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(note => note.category === selectedCategory);
    }
    
    // Apply tag filter
    if (selectedTag) {
      filtered = filtered.filter(note => note.tags?.includes(selectedTag));
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const searchResults = searchNotes(searchQuery);
      filtered = filtered.filter(note => 
        searchResults.some(searchNote => searchNote.id === note.id)
      );
    }
    
    setFilteredNotes(filtered);
  }, [notes, selectedCategory, selectedTag, searchQuery]);

  // Get all unique tags from notes
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach(note => {
      note.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [notes]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedTag('');
    setSearchQuery('');
  };

  const getNoteStats = () => {
    const totalNotes = notes.length;
    const notesWithImages = notes.filter(note => note.hasImages).length;
    const notesWithCategories = notes.filter(note => note.category).length;
    const notesWithTags = notes.filter(note => note.tags && note.tags.length > 0).length;
    
    return { totalNotes, notesWithImages, notesWithCategories, notesWithTags };
  };

  const stats = getNoteStats();

  // Show loading state before client-side rendering
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">My Notes</h1>
        <Link
          href="/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          New Note
        </Link>
      </div>

      {!isConnected && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            Please connect your wallet to create and manage notes.
          </p>
        </div>
      )}

      {/* Statistics */}
      {notes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalNotes}</div>
            <div className="text-sm text-blue-800">Total Notes</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.notesWithCategories}</div>
            <div className="text-sm text-purple-800">Categorized</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.notesWithTags}</div>
            <div className="text-sm text-orange-800">Tagged</div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      {notes.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Notes
              </label>
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, tags, or category..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="w-full md:w-48">
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                id="category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Tag Filter */}
            <div className="w-full md:w-48">
              <label htmlFor="tag" className="block text-sm font-medium text-gray-700 mb-2">
                Tag
              </label>
              <select
                id="tag"
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>#{tag}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filters */}
          {(selectedCategory || selectedTag || searchQuery) && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Active filters:</span>
              {selectedCategory && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  📁 {selectedCategory}
                  <button
                    onClick={() => setSelectedCategory('')}
                    className="ml-1 hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedTag && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  #{selectedTag}
                  <button
                    onClick={() => setSelectedTag('')}
                    className="ml-1 hover:bg-gray-200 rounded-full w-4 h-4 flex items-center justify-center"
                  >
                    ×
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  🔍 &ldquo;{searchQuery}&rdquo;
                  <button
                    onClick={() => setSearchQuery('')}
                    className="ml-1 hover:bg-green-200 rounded-full w-4 h-4 flex items-center justify-center"
                  >
                    ×
                  </button>
                </span>
              )}
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}

      {/* View Mode Toggle */}
      {notes.length > 0 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {filteredNotes.length} of {notes.length} notes
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">View:</span>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No notes yet.</p>
          {isConnected && (
            <Link
              href="/new"
              className="inline-block mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create your first note
            </Link>
          )}
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No notes match your current filters.</p>
          <button
            onClick={clearFilters}
            className="mt-4 text-blue-600 hover:text-blue-700 underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
          {filteredNotes.map((note) => (
            <Link
              key={note.id}
              href={`/note/${note.id}`}
              className={`block p-6 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow ${
                viewMode === 'list' ? 'flex items-center justify-between' : ''
              }`}
            >
              <div className={viewMode === 'list' ? 'flex-1' : ''}>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {note.title}
                </h2>
                
                {/* Note metadata */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Created: {formatDate(note.createdAt)}</span>
                    <span className="font-mono text-xs">{note.cid ? `${note.cid.slice(0, 10)}...` : 'No CID'}</span>
                  </div>
                  
                  {/* Category and Tags */}
                  <div className="flex flex-wrap gap-1">
                    {note.category && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        📁 {note.category}
                      </span>
                    )}
                    {note.tags?.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        #{tag}
                      </span>
                    ))}
                    {note.tags && note.tags.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{note.tags.length - 3} more
                      </span>
                    )}
                  </div>
                  
                  {/* Note indicators */}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {note.hasImages && (
                      <span className="flex items-center gap-1">
                        📷 Images
                      </span>
                    )}
                    {note.version && note.version > 1 && (
                      <span className="flex items-center gap-1">
                        📝 v{note.version}
                      </span>
                    )}
                    {note.updatedAt && (
                      <span className="flex items-center gap-1">
                        ✏️ Updated
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
