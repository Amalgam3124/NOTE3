import { NextResponse } from "next/server";
import { getService, getDefaultProviderAddress } from "@/server/og-broker";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { address, providerAddress } = body || {};
    if (!address || typeof address !== "string") {
      return NextResponse.json({ error: "Missing address" }, { status: 400 });
    }

    const addr = providerAddress || getDefaultProviderAddress();
    const { endpoint } = await getService(addr);

    const payload = { address, provider: addr };

    // Build candidate endpoints for account creation (broader variants)
    const candidates: string[] = [];
    let base = String(endpoint || '').replace(/\/+$/, '');
    const pushUnique = (u: string) => { if (u && !candidates.includes(u)) candidates.push(u); };

    // Direct base
    pushUnique(`${base}/add-account`);
    // Remove '/proxy'
    if (base.includes("/proxy")) {
      pushUnique(`${base.replace("/proxy", "")}/add-account`);
    }
    // '/v1/proxy' -> '/v1'
    if (base.includes("/v1/proxy")) {
      pushUnique(`${base.replace("/v1/proxy", "/v1")}/add-account`);
    }
    // If ends with '/v1', also try without it
    if (base.endsWith('/v1')) {
      pushUnique(`${base.replace(/\/v1$/, '')}/add-account`);
    }
    // Origin-level variants
    try {
      const origin = new URL(base).origin;
      pushUnique(`${origin}/add-account`);
      pushUnique(`${origin}/v1/add-account`);
    } catch {}

    let lastText = "";
    for (const url of candidates) {
      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const text = await resp.text();
        lastText = text;
        if (resp.ok || /already exists/i.test(text)) {
          return NextResponse.json({ ok: true, url, message: text });
        }
      } catch (e: any) {
        lastText = e?.message || String(e);
      }
    }

    return NextResponse.json(
      { ok: false, error: "add-account failed", message: lastText, tried: candidates },
      { status: 502 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unexpected error" }, { status: 500 });
  }
}