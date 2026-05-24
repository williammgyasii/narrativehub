import "server-only";

import { getAuthUserOrNull } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { redditLeads } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { RedditLead } from "@/lib/db/schema";

export async function getRedditLeads(
  status?: string
): Promise<RedditLead[]> {
  const userId = await getAuthUserOrNull();
  if (!userId) return [];

  const conditions = [eq(redditLeads.userId, userId)];
  if (status && status !== "all") {
    conditions.push(eq(redditLeads.status, status));
  }

  return db
    .select()
    .from(redditLeads)
    .where(and(...conditions))
    .orderBy(desc(redditLeads.createdAt))
    .limit(50);
}

export async function getNewRedditLeadsCount(): Promise<number> {
  const userId = await getAuthUserOrNull();
  if (!userId) return 0;

  const results = await db
    .select({ id: redditLeads.id })
    .from(redditLeads)
    .where(
      and(eq(redditLeads.userId, userId), eq(redditLeads.status, "new"))
    );

  return results.length;
}
