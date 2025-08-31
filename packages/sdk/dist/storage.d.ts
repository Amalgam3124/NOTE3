declare global {
    interface Window {
        ethereum?: any;
    }
}
export declare function calculateStorageFee(dataSize: number): bigint;
export declare function getActualStorageFee(data: any): Promise<bigint>;
export declare function getWalletAddress(signer: any): Promise<string>;
export declare function getGatewayUrl(cid: string): string;
export declare function isValidCID(cid: string): boolean;
export declare function putFile(file: File, signer: any): Promise<{
    cid: string;
}>;
export declare function getFile(cid: string): Promise<Blob>;
export declare function putJSON<T>(data: T, signer: any): Promise<{
    cid: string;
}>;
export declare function getJSON<T>(cid: string): Promise<T>;
//# sourceMappingURL=storage.d.ts.map