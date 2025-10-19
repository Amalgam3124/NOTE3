import { INFTConversionResult, INFTInfo, INFTIntelligence, Note } from '@onchain-notes/types';
/**
 * Convert a note to INFT with intelligence capabilities
 */
export declare function convertNoteToINFT(note: Note, signer: any, providerOrConfig?: any, maybeConfig?: Partial<INFTIntelligence>): Promise<INFTConversionResult>;
/**
 * Get INFT information
 */
export declare function getINFTInfo(tokenId: string, provider: any): Promise<INFTInfo | null>;
/**
 * Get all INFTs owned by an address
 */
export declare function getOwnedINFTs(ownerAddress: string, provider: any): Promise<INFTInfo[]>;
/**
 * Check if contract supports ERC-7857
 */
export declare function isERC7857Compliant(provider: any): Promise<boolean>;
/**
 * Get contract standard
 */
export declare function getContractStandard(provider: any): Promise<string>;
/**
 * Generate summary for an INFT
 */
export declare function generateINFTSummary(tokenId: string, signer: any): Promise<void>;
/**
 * Add Q&A pair to an INFT
 */
export declare function addINFTQAPair(tokenId: string, question: string, answer: string, signer: any): Promise<void>;
/**
 * Get summary for an INFT
 */
export declare function getINFTSummary(tokenId: string, provider: any): Promise<string>;
/**
 * Get Q&A pairs for an INFT
 */
export declare function getINFTQAPairs(tokenId: string, provider: any): Promise<string[]>;
/**
 * Get intelligence configuration for an INFT
 */
export declare function getINFTIntelligenceConfig(tokenId: string, provider: any): Promise<INFTIntelligence>;
//# sourceMappingURL=inft.d.ts.map