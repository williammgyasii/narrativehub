import { auth } from "@/lib/auth/server";
import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(request: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 500 }
    );
  }

  const { title, eventType, location, clientName } = await request.json();

  const prompt = `Write a concise shoot description (3-5 sentences) for this photography event:

Event: ${title}
Type: ${eventType || "Photography shoot"}
${location ? `Location: ${location}` : ""}
${clientName ? `Client: ${clientName}` : ""}

The description should cover:
- What kind of shoot this is and its purpose
- Key moments or deliverables to capture
- Any special considerations for this type of event

Write in second person ("You will...") as planning notes for the photographer. Be specific and practical, not flowery.

Return ONLY the description text, no JSON, no markdown, no quotes.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.error?.message || `OpenAI error: ${res.status}` },
        { status: 500 }
      );
    }

    const data = await res.json();
    const description = data.choices?.[0]?.message?.content?.trim();

    return NextResponse.json({ description: description || "" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to generate" },
      { status: 500 }
    );
  }
}
