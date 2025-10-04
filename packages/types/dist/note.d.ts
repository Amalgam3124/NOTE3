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
export type INFTMetadata = {
    name: string;
    description: string;
    image?: string;
    external_url?: string;
    attributes: INFTAttribute[];
    intelligence: INFTIntelligence;
    created_at: number;
    author: `0x${string}`;
    note_id: string;
    note_cid: string;
};
export type INFTAttribute = {
    trait_type: string;
    value: string | number | boolean;
    display_type?: 'string' | 'number' | 'date' | 'boost_number' | 'boost_percentage';
};
export type INFTIntelligence = {
    capabilities: string[];
    model_version: string;
    compute_requirements: {
        memory: number;
        compute_units: number;
    };
    data_sources: string[];
    prompt_template?: string;
    is_encrypted?: boolean;
};
export type INFTConversionRequest = {
    note_id: string;
    note_cid: string;
    intelligence_config: INFTIntelligence;
    metadata_overrides?: Partial<INFTMetadata>;
};
export type INFTConversionResult = {
    inft_token_id: string;
    inft_contract_address: `0x${string}`;
    metadata_uri: string;
    transaction_hash: `0x${string}`;
    gas_used: number;
    conversion_timestamp: number;
};
export type INFTInfo = {
    token_id: string;
    contract_address: `0x${string}`;
    metadata: INFTMetadata;
    owner: `0x${string}`;
    created_at: number;
    note_reference: {
        note_id: string;
        note_cid: string;
    };
};
//# sourceMappingURL=note.d.ts.map