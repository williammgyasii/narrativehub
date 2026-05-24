"use server";

import { getAuthUser } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { leads, skippedPlaces } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { findEmails, isHunterConfigured } from "@/lib/hunter";
import { scrapeContacts } from "@/lib/contact-scraper";

function extractUrlFromNotes(notes: string): string | null {
  const match = notes.match(/Website:\s*(https?:\/\/[^\s,]+)/i);
  if (match) return match[1];
  const urlMatch = notes.match(/URL:\s*(https?:\/\/[^\s,]+)/i);
  return urlMatch?.[1] || null;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^www\./, "");
  }
}

export async function saveAsLead(data: {
  name: string;
  businessName?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  leadType: "wedding" | "corporate" | "real_estate" | "architectural";
  source: string;
  notes?: string;
}) {
  const userId = await getAuthUser();

  const existing = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.userId, userId),
        eq(leads.name, data.name),
        ...(data.businessName
          ? [eq(leads.businessName, data.businessName)]
          : [])
      )
    );

  if (existing.length > 0) {
    return { error: "A lead with this name already exists in your pipeline." };
  }

  const noteParts: string[] = [];
  if (data.address) noteParts.push(`Address: ${data.address}`);
  if (data.website) noteParts.push(`Website: ${data.website}`);
  if (data.notes) noteParts.push(data.notes);
  const combinedNotes = noteParts.join("\n");

  let enrichedEmail = data.email || null;
  let enrichmentNote = "";

  if (!enrichedEmail) {
    const url = data.website || extractUrlFromNotes(combinedNotes);
    if (url) {
      const domain = extractDomain(url);
      try {
        if (isHunterConfigured()) {
          const result = await findEmails(domain);
          if (result.ok && result.results.length > 0) {
            const best = result.results.sort(
              (a, b) => b.confidence - a.confidence
            )[0];
            if (best.confidence >= 70) {
              enrichedEmail = best.email;
              enrichmentNote = `\n[Auto-enriched] Email found via Hunter.io (${best.confidence}% confidence)`;
            }
          }
        }

        if (!enrichedEmail) {
          const scraped = await scrapeContacts(domain);
          if (scraped.length > 0) {
            const best = scraped.sort(
              (a, b) => b.confidence - a.confidence
            )[0];
            if (best.confidence >= 50) {
              enrichedEmail = best.email;
              enrichmentNote = `\n[Auto-enriched] Email found via website scraping (${best.confidence}% confidence)`;
            }
          }
        }
      } catch {
        // Enrichment is best-effort — don't block the save
      }
    }
  }

  const [lead] = await db
    .insert(leads)
    .values({
      userId,
      name: data.name,
      businessName: data.businessName || null,
      email: enrichedEmail,
      phone: data.phone || null,
      leadType: data.leadType,
      source: data.source,
      notes: (combinedNotes + enrichmentNote) || null,
    })
    .returning();

  revalidatePath("/leads");
  revalidatePath("/");

  return {
    success: true,
    leadId: lead.id,
    enrichedEmail: enrichedEmail && !data.email ? enrichedEmail : undefined,
  };
}

export async function markPlaceUnreachable(
  placeId: string,
  name: string
) {
  const userId = await getAuthUser();

  const existing = await db
    .select()
    .from(skippedPlaces)
    .where(
      and(
        eq(skippedPlaces.userId, userId),
        eq(skippedPlaces.placeId, placeId)
      )
    );

  if (existing.length > 0) return;

  await db.insert(skippedPlaces).values({
    userId,
    placeId,
    name,
    reason: "unreachable",
  });

  revalidatePath("/lead-finder");
}

export async function getSkippedPlaceIds(): Promise<Set<string>> {
  const userId = await getAuthUser();

  const rows = await db
    .select({ placeId: skippedPlaces.placeId })
    .from(skippedPlaces)
    .where(eq(skippedPlaces.userId, userId));

  return new Set(rows.map((r) => r.placeId));
}
