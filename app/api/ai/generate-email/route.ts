import { auth } from "@/lib/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/queries/profile";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface GenerateRequest {
  prompt: string;
  leadName?: string;
  businessName?: string;
  leadType?: string;
  tone?: "professional" | "friendly" | "casual";
  intent?: "introduction" | "follow-up" | "proposal" | "thank-you";
}

const LEAD_TYPE_CONTEXT: Record<string, string> = {
  wedding: `The recipient is a WEDDING VENUE, PLANNER, or COORDINATOR.
You are a fellow wedding industry professional pitching a PARTNERSHIP — NOT a couple looking to book them.

STRUCTURE THE EMAIL LIKE THIS:
1. Brief intro — who you are by name, your business, and where you're based
2. What you do — list specific wedding services: ceremony & reception coverage, engagement sessions, bridal portraits, detail shots, couple portraits, getting-ready coverage, vendor highlight shots
3. Why it benefits THEM — your photos make their venue/planning look incredible, which they can use on their website, social media, and marketing to attract more couples. Offer to do a styled shoot at their venue.
4. Social proof — mention years of experience, number of weddings shot, any notable venues you've worked with
5. CTA — suggest a quick call, coffee meetup, or offer to send your portfolio

Tone: Professional but warm — vendor-to-vendor.`,

  corporate: `The recipient is a CORPORATE EVENT PLANNER, COMPANY, or BUSINESS.

STRUCTURE THE EMAIL LIKE THIS:
1. Brief intro — who you are, your business name, and location
2. What you offer — corporate headshots, team photos, event coverage (conferences, galas, product launches), office/workspace photography, branding content
3. Why it matters for them — professional visuals strengthen their brand, website, LinkedIn presence, and marketing collateral. Companies with professional imagery build more trust.
4. What sets you apart — quick turnaround, flexible scheduling, on-location or studio, experience with corporate clients
5. CTA — offer to send samples of corporate work or schedule a brief call

Tone: Polished and business-like.`,

  real_estate: `The recipient is a REAL ESTATE AGENT, BROKER, or PROPERTY MANAGER.

STRUCTURE THE EMAIL LIKE THIS:
1. Brief intro — who you are, where you're based, that you specialize in real estate photography
2. Services — interior/exterior shots, drone/aerial photography, twilight/golden hour shots, virtual tours, floor plans, video walkthroughs
3. The ROI pitch — listings with professional photos sell 32% faster and for higher prices. Agents who use pro photography get more listing appointments.
4. Logistics — fast turnaround (24-48 hours), easy online scheduling, competitive per-listing pricing
5. CTA — offer a free or discounted first shoot so they can see the quality

Tone: Direct and results-focused.`,

  architectural: `The recipient is an ARCHITECT, INTERIOR DESIGNER, BUILDER, or DESIGN FIRM.

STRUCTURE THE EMAIL LIKE THIS:
1. Brief intro — who you are, your background in architectural/design photography
2. What you do — completed project documentation, construction progress photos, interior design photography, detail and material close-ups, exterior and landscape context shots
3. How it helps them — high-quality project photography for their portfolio, website, award submissions (AIA, design competitions), press features, and client presentations
4. Your approach — you understand how to capture spatial flow, natural light, material textures, and design intent
5. CTA — offer to discuss an upcoming project or send your architectural portfolio

Tone: Artistic and design-appreciative.`,
};

function buildSystemPrompt(profile: {
  name: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  businessName?: string | null;
  website?: string | null;
  instagram?: string | null;
  portfolioUrl?: string | null;
  specialties?: string | null;
  yearsExperience?: number | null;
  bio?: string | null;
}, leadType?: string) {
  const sig = [
    profile.name,
    profile.businessName && profile.businessName !== profile.name
      ? profile.businessName
      : null,
    profile.phone,
    profile.email,
    profile.website,
    profile.portfolioUrl && profile.portfolioUrl !== profile.website
      ? `Portfolio: ${profile.portfolioUrl}`
      : null,
    profile.instagram ? `IG: ${profile.instagram}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const typeContext = leadType && LEAD_TYPE_CONTEXT[leadType]
    ? `\n\nLEAD TYPE CONTEXT:\n${LEAD_TYPE_CONTEXT[leadType]}`
    : "";

  return `You are writing outreach emails on behalf of ${profile.name}, a professional photographer${profile.location ? ` based in ${profile.location}` : ""}.${
    profile.specialties ? ` Specialties: ${profile.specialties}.` : ""
  }${profile.yearsExperience ? ` ${profile.yearsExperience} years of experience.` : ""}${
    profile.bio ? `\n\nAbout: ${profile.bio}` : ""
  }${typeContext}

RULES:
- Write as ${profile.name} (first person). Use their actual name, not placeholders like [Your Name] or [Your Contact Information].
- Aim for 200-300 words — detailed enough to introduce yourself and your services, but not a wall of text.
- ALWAYS introduce who you are (name, business, location) in the opening.
- ALWAYS mention specific services you offer that are relevant to this lead type.
- Be personal — mention the recipient's business by name and reference something specific about them if possible.
- Show mutual value — explain how working together benefits THEM specifically.
- End with a clear but soft call-to-action (quick call, coffee, send portfolio, etc.).
- Do NOT use generic filler phrases like "I hope this message finds you well" or "I've heard wonderful things about..." — get straight to the point.
- Do NOT be vague. Be specific about what you do and what you offer.
- The email should end with a professional sign-off and this signature:

${sig}

Return ONLY a JSON object with two fields:
- "subject": the email subject line
- "body": the full email body (plain text, no HTML) — INCLUDING the sign-off and signature at the end.

Do NOT include any markdown, code fences, or explanation — just the raw JSON object.`;
}

const FALLBACK_SYSTEM_PROMPT = `You are an email copywriter for a professional photographer. Write cold outreach emails that are 200-300 words, personal, detailed, and service-focused. Always introduce who you are and what specific services you offer. End with a clear call-to-action.

IMPORTANT: Do NOT use placeholder text like [Your Name] or [Your Contact Information]. If you don't know the photographer's details, sign off with just "Best" and no name.

Return ONLY a JSON object with two fields:
- "subject": the email subject line
- "body": the email body text (plain text, no HTML)

Do NOT include any markdown, code fences, or explanation — just the raw JSON object.`;

export async function POST(request: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error:
          "OpenAI API key not configured. Add OPENAI_API_KEY to .env.local",
      },
      { status: 500 }
    );
  }

  const body: GenerateRequest = await request.json();

  const profile = await getProfile();

  const systemPrompt = profile
    ? buildSystemPrompt(profile, body.leadType)
    : FALLBACK_SYSTEM_PROMPT;

  const contextParts: string[] = [];
  if (body.leadName) contextParts.push(`Recipient name: ${body.leadName}`);
  if (body.businessName)
    contextParts.push(`Their business: ${body.businessName}`);
  if (body.leadType)
    contextParts.push(`Lead type: ${body.leadType.replace("_", " ")}`);
  if (body.tone) contextParts.push(`Tone: ${body.tone}`);
  if (body.intent) contextParts.push(`Email intent: ${body.intent}`);

  const userMessage =
    contextParts.length > 0
      ? `Context:\n${contextParts.join("\n")}\n\nUser instructions: ${body.prompt}`
      : body.prompt;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 1000,
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

    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    const cleaned = content
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    return NextResponse.json({
      subject: parsed.subject || "",
      body: parsed.body || "",
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Failed to generate email",
      },
      { status: 500 }
    );
  }
}
