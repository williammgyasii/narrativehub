import { auth } from "@/lib/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { findEmails, isHunterConfigured } from "@/lib/hunter";
import { scrapeContacts } from "@/lib/contact-scraper";
import { searchPeopleByCompany, isApolloConfigured } from "@/lib/apollo";

export interface EnrichedContact {
  email?: string;
  name?: string;
  position?: string;
  confidence: number;
  source: "hunter" | "website" | "apollo";
  apolloId?: string;
  hasEmail?: boolean;
  linkedinUrl?: string;
}

function extractDomain(input: string): string {
  try {
    const url = new URL(input.startsWith("http") ? input : `https://${input}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return input.replace(/^www\./, "");
  }
}

export async function GET(request: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const rawDomain = searchParams.get("domain") || searchParams.get("url");
  const companyName = searchParams.get("companyName");
  const location = searchParams.get("location");

  if (!rawDomain && !companyName) {
    return NextResponse.json(
      { error: "Query parameter 'domain', 'url', or 'companyName' is required" },
      { status: 400 }
    );
  }

  const contacts: EnrichedContact[] = [];
  const domain = rawDomain ? extractDomain(rawDomain) : null;

  // Phase 1: Hunter.io (if we have a domain)
  if (domain && isHunterConfigured()) {
    const hunterResult = await findEmails(domain);
    if (hunterResult.ok) {
      for (const r of hunterResult.results) {
        contacts.push({
          email: r.email,
          name: [r.firstName, r.lastName].filter(Boolean).join(" ") || undefined,
          position: r.position,
          confidence: r.confidence,
          source: "hunter",
        });
      }
    }
  }

  // Phase 2: Website scraping (if we have a domain and Hunter found nothing)
  if (domain && contacts.length === 0) {
    const scraped = await scrapeContacts(domain);
    for (const s of scraped) {
      contacts.push({
        email: s.email,
        name: s.name,
        position: s.position,
        confidence: s.confidence,
        source: "website",
      });
    }
  }

  // Phase 3: Apollo People Search (if we have a company name — works even without a domain)
  if (companyName && isApolloConfigured()) {
    const apolloResult = await searchPeopleByCompany(companyName, location || undefined);
    if (apolloResult.ok) {
      for (const p of apolloResult.people) {
        const alreadyFound = contacts.some(
          (c) => c.name?.toLowerCase() === p.name.toLowerCase()
        );
        if (!alreadyFound) {
          contacts.push({
            name: p.name,
            position: p.title,
            confidence: p.hasEmail ? 80 : 40,
            source: "apollo",
            apolloId: p.id,
            hasEmail: p.hasEmail,
            linkedinUrl: p.linkedinUrl,
          });
        }
      }
    }
  }

  return NextResponse.json({ contacts, domain: domain || companyName });
}
