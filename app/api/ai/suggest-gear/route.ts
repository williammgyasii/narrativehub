import { auth } from "@/lib/auth/server";
import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const GEAR_CONTEXT: Record<string, string> = {
  wedding: `Full-day wedding photography. Cover ceremony, reception, getting ready, first look, portraits, detail shots, cake cutting, first dance, toasts. Often 8-12 hours.`,
  corporate: `Corporate event photography. Cover headshots, group photos, keynote speakers, networking, venue/branding details, panel discussions. Professional lighting needed.`,
  real_estate: `Real estate / property photography. Cover interior rooms, exterior, drone/aerial, twilight shots, detail features, neighborhood context. Wide-angle essential.`,
  architectural: `Architectural / design photography. Cover building exterior (multiple angles), interior spaces, material details, spatial flow, natural light studies. Tilt-shift helpful.`,
};

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

  const { eventType } = await request.json();

  const context = GEAR_CONTEXT[eventType] || `General photography shoot (${eventType || "unspecified type"}).`;

  const prompt = `You are a professional photographer's gear advisor. Suggest a gear checklist for this shoot:

${context}

Return a JSON array of objects, each with:
- "item": the gear name (be specific — e.g. "Canon 70-200mm f/2.8" not just "telephoto lens")
- "category": one of "camera", "lens", "lighting", "audio", "support", "accessory"
- "priority": "essential" or "nice-to-have"

Include 8-15 items. Cover camera bodies, lenses, lighting, supports, and accessories.

Return ONLY the JSON array, no markdown, no code fences, no explanation.`;

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
        max_tokens: 800,
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
    const content = data.choices?.[0]?.message?.content?.trim();
    const cleaned = content
      ?.replace(/^```json\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const suggestions = JSON.parse(cleaned || "[]");

    return NextResponse.json({ suggestions });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to suggest gear" },
      { status: 500 }
    );
  }
}
