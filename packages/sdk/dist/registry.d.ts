export interface RegistryEntry {
    id: string;
    cid: string;
    metadata: Record<string, any>;
}
export declare function registerNote(entry: RegistryEntry): Promise<void>;
export declare function getRegistryEntry(id: string): Promise<RegistryEntry | null>;
//# sourceMappingURL=registry.d.ts.map