export type Note = {
  id: string;                 // `${address}-${Date.now()}`
  title: string;
  markdown: string;
  images: string[];           // Array of image CIDs (for cover/attachments)
  inlineImages: InlineImage[]; // Array of inline images in markdown
  public: boolean;            // Reserved for Wave3
  createdAt: number;
  author: `0x${string}`;      // Wallet address
  category?: string;          // Note category for filtering
  tags?: string[];            // Optional tags for better organization
  version?: number;           // Version number for edited notes
  parentId?: string;          // ID of the original note (for edited versions)
  editHistory?: string[];     // Array of previous CIDs
};

// New type for inline images in markdown
export type InlineImage = {
  cid: string;
  filename: string;
  alt: string;
  position: number;           // Position in markdown text
  markdownRef: string;        // The actual markdown syntax like ![alt](cid)
};

export type NoteIndexItem = {
  id: string;
  cid: string;
  title: string;
  createdAt: number;
  updatedAt?: number;
  public?: boolean;
  category?: string;          // Note category
  tags?: string[];            // Optional tags
  version?: number;           // Version number
  parentId?: string;          // Parent note ID for edited versions
  hasImages?: boolean;        // Whether the note contains cover/attachment images
  hasInlineImages?: boolean;  // Whether the note contains inline images in markdown
};

export type NoteSnapshot = {
  title: string;
  markdown: string;
  images: string[];
  sourceCID: string;
  sha256: `0x${string}`;
  publishedAt: number;
  author: `0x${string}`;
  category?: string;
  tags?: string[];
  version?: number;
  parentId?: string;
};

// New types for image handling
export type ImageUpload = {
  cid: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: number;
  author: `0x${string}`;
};

export type NoteWithImages = Note & {
  imageDetails?: ImageUpload[];
};
