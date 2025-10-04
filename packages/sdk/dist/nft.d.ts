export interface NFTMetadata {
    name: string;
    description: string;
    image: string;
    attributes: Array<{
        trait_type: string;
        value: string;
    }>;
}
export declare function mintNoteNFT(noteId: string, metadata: NFTMetadata): Promise<string>;
export declare function getNFTMetadata(tokenId: string): Promise<NFTMetadata | null>;
//# sourceMappingURL=nft.d.ts.map