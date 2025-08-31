export type Note = {
    id: string;
    title: string;
    markdown: string;
    images: string[];
    inlineImages: InlineImage[];
    public: boolean;
    createdAt: number;
    author: `0x${string}`;
    category?: string;
    tags?: string[];
    version?: number;
    parentId?: string;
    editHistory?: string[];
};
export type InlineImage = {
    cid: string;
    filename: string;
    alt: string;
    position: number;
    markdownRef: string;
};
export type NoteIndexItem = {
    id: string;
    cid: string;
    title: string;
    createdAt: number;
    updatedAt?: number;
    public?: boolean;
    category?: string;
    tags?: string[];
    version?: number;
    parentId?: string;
    hasImages?: boolean;
    hasInlineImages?: boolean;
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
//# sourceMappingURL=note.d.ts.map