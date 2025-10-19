import { NextResponse } from "next/server";
import { getService, getDefaultProviderAddress } from "@/server/og-broker";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { content, question, providerAddress } = body || {};

    if (!content || typeof content !== "string" || !question || typeof question !== "string") {
      return NextResponse.json({ error: "Missing content or question" }, { status: 400 });
    }

    const addr = providerAddress || getDefaultProviderAddress();
    const { broker, endpoint, model } = await getService(addr);

    const messages = [
      { role: "system", content: "You are an intelligent assistant. Answer accurately, concisely, and with evidence based on the note content. If information is insufficient, say so." },
      { role: "user", content: `Note content:\n\n${content}\n\nQuestion: ${question}` },
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
    const answer = data?.choices?.[0]?.message?.content || "";
    const chatID = data?.id;

    let isValid = false;
    try {
      isValid = await broker.inference.processResponse(addr, answer, chatID);
    } catch (err) {
      isValid = false;
    }

    return NextResponse.json({ answer, isValid, chatID });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unexpected error" }, { status: 500 });
  }
}