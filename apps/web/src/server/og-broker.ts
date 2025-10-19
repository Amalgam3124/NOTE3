import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";

const RPC_URL = process.env.NODE_ENV === "production"
  ? "https://evmrpc.0g.ai"
  : (process.env.NEXT_PUBLIC_OG_ENDPOINT || "https://evmrpc-testnet.0g.ai/");

const PRIVATE_KEY = process.env.OG_COMPUTE_PRIVATE_KEY || process.env.PRIVATE_KEY;
const DEFAULT_PROVIDER_ADDRESS = process.env.OG_COMPUTE_PROVIDER_ADDRESS || "0x3feE5a4dd5FDb8a32dDA97Bed899830605dBD9D3"; // deep reasoning model

let brokerPromise: Promise<any> | null = null;

export async function getBroker() {
  if (!brokerPromise) {
    if (!PRIVATE_KEY) {
      throw new Error("Missing OG_COMPUTE_PRIVATE_KEY/PRIVATE_KEY in environment");
    }
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY!, provider);
    brokerPromise = createZGComputeNetworkBroker(wallet);
  }
  return brokerPromise;
}

export async function ensureProviderAcknowledged(providerAddress?: string) {
  const broker = await getBroker();
  const addr = providerAddress || DEFAULT_PROVIDER_ADDRESS;
  try {
    await broker.inference.acknowledgeProviderSigner(addr);
  } catch (err) {
    // It's okay if already acknowledged; log and continue
    console.warn("acknowledgeProviderSigner warning:", (err as any)?.message || err);
  }
  return { broker, providerAddress: addr };
}

export async function getService(providerAddress?: string) {
  const { broker, providerAddress: addr } = await ensureProviderAcknowledged(providerAddress);
  const meta = await broker.inference.getServiceMetadata(addr);
  return { broker, endpoint: meta.endpoint, model: meta.model, providerAddress: addr };
}

export function getDefaultProviderAddress() {
  return DEFAULT_PROVIDER_ADDRESS;
}