// Define types locally to avoid SSR issues
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

const STORAGE_KEY = 'note3-index';
const CATEGORIES_KEY = 'note3-categories';

export function getLocalIndex(): NoteIndexItem[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load local index:', error);
    return [];
  }
}

export function addToLocalIndex(item: NoteIndexItem): void {
  if (typeof window === 'undefined') return;
  
  try {
    const index = getLocalIndex();
    const existingIndex = index.findIndex(existing => existing.id === item.id);
    
    if (existingIndex >= 0) {
      // Update existing item
      index[existingIndex] = { ...index[existingIndex], ...item };
    } else {
      // Add new item
      index.push(item);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(index));
  } catch (error) {
    console.error('Failed to save to local index:', error);
  }
}

export function findById(id: string): NoteIndexItem | undefined {
  const index = getLocalIndex();
  return index.find(item => item.id === id);
}

export function removeFromLocalIndex(id: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const index = getLocalIndex();
    const filteredIndex = index.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredIndex));
  } catch (error) {
    console.error('Failed to remove from local index:', error);
  }
}

// New functions for category management
export function getCategories(): string[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(CATEGORIES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load categories:', error);
    return [];
  }
}

export function addCategory(category: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const categories = getCategories();
    if (!categories.includes(category)) {
      categories.push(category);
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
    }
  } catch (error) {
    console.error('Failed to add category:', error);
  }
}

export function getNotesByCategory(category?: string): NoteIndexItem[] {
  const index = getLocalIndex();
  if (!category) return index;
  return index.filter(item => item.category === category);
}

export function getNotesByTag(tag: string): NoteIndexItem[] {
  const index = getLocalIndex();
  return index.filter(item => item.tags?.includes(tag));
}

// Function to update note after editing
export function updateNoteAfterEdit(
  originalId: string, 
  newNote: NoteIndexItem, 
  newCid: string
): void {
  if (typeof window === 'undefined') return;
  
  try {
    const index = getLocalIndex();
    
    // Find the original note
    const originalIndex = index.findIndex(item => item.id === originalId);
    if (originalIndex >= 0) {
      // Replace the original note with the updated version
      index[originalIndex] = {
        ...newNote,
        updatedAt: Date.now(),
        // Keep the original creation date
        createdAt: index[originalIndex].createdAt
      };
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(index));
  } catch (error) {
    console.error('Failed to update note after editing:', error);
  }
}

// Function to search notes
export function searchNotes(query: string): NoteIndexItem[] {
  const index = getLocalIndex();
  const lowerQuery = query.toLowerCase();
  
  return index.filter(item => 
    item.title.toLowerCase().includes(lowerQuery) ||
    item.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
    item.category?.toLowerCase().includes(lowerQuery)
  );
}
