import { NextResponse } from "next/server";
import { getService, getDefaultProviderAddress } from "@/server/og-broker";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { content, providerAddress, prompt } = body || {};

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }

    const addr = providerAddress || getDefaultProviderAddress();
    const { broker, endpoint, model } = await getService(addr);

    const messages = [
      {
        role: "user",
        content: prompt ? `${prompt}\n\n${content}` : `Please generate a structured summary of the following note, including key points and action items:\n\n${content}`,
      },
    ];

    const headers = await broker.inference.getRequestHeaders(addr, JSON.stringify(messages));

    const response = await fetch(`${endpoint}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ model, messages }),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: `Service error: ${text}` }, { status: 502 });
    }

    const data = await response.json();
    const summary = data?.choices?.[0]?.message?.content || "";
    const chatID = data?.id;

    let isValid = false;
    try {
      isValid = await broker.inference.processResponse(addr, summary, chatID);
    } catch (err) {
      // For non-verifiable services, this may throw or return false
      isValid = false;
    }

    return NextResponse.json({ summary, isValid, chatID });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unexpected error" }, { status: 500 });
  }
}