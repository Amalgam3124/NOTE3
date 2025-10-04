type Note = {
    id: string;
    title: string;
    markdown: string;
    images: string[];
    inlineImages: ImageUpload[];
    public: boolean;
    createdAt: number;
    author: string;
    category?: string;
    tags?: string[];
    version?: number;
    parentId?: string;
};
type ImageUpload = {
    cid: string;
    name: string;
    size: number;
    type: string;
    markdown: string;
};
type NoteWithCID = Note & {
    cid?: string;
};
export declare function calculateStorageFee(dataSize: number): bigint;
export declare function getActualStorageFee(data: any): Promise<bigint>;
export declare function saveNote(title: string, content: string, signer: any, options?: {
    category?: string;
    tags?: string[];
    public?: boolean;
    images?: string[];
    inlineImages?: Array<{
        markdown: string;
        file: File;
    }>;
}): Promise<{
    note: NoteWithCID;
    cid: string;
    txHash: string;
}>;
export declare function loadNote(cid: string, signer: any): Promise<NoteWithCID | null>;
export declare function putJSON(data: string, signer: any): Promise<{
    success: boolean;
    cid?: string;
    txHash?: string;
    size?: number;
    error?: string;
}>;
export declare function getJSON(cid: string, signer: any): Promise<{
    success: boolean;
    data?: any;
    error?: string;
}>;
export declare function putFile(file: File, signer: any): Promise<{
    cid: string;
}>;
export declare function getFile(cid: string, signer: any): Promise<File | null>;
export {};
//# sourceMappingURL=storage.d.ts.map