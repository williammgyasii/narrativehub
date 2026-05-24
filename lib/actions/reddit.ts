"use server";

import { getAuthUser } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { redditLeads, leads } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function dismissRedditLead(id: string) {
  const userId = await getAuthUser();

  await db
    .update(redditLeads)
    .set({ status: "dismissed" })
    .where(and(eq(redditLeads.id, id), eq(redditLeads.userId, userId)));

  revalidatePath("/");
}

export async function saveRedditLeadAsLead(id: string) {
  const userId = await getAuthUser();

  const [redditLead] = await db
    .select()
    .from(redditLeads)
    .where(and(eq(redditLeads.id, id), eq(redditLeads.userId, userId)))
    .limit(1);

  if (!redditLead) throw new Error("Reddit lead not found");

  await db.insert(leads).values({
    userId,
    name: redditLead.author,
    businessName: `r/${redditLead.subreddit}`,
    leadType: "wedding",
    source: "reddit",
    notes: `Reddit post: ${redditLead.title}\n\nhttps://reddit.com${redditLead.permalink}`,
    status: "new",
  });

  await db
    .update(redditLeads)
    .set({ status: "saved" })
    .where(eq(redditLeads.id, id));

  revalidatePath("/");
  revalidatePath("/leads");
}

export async function triggerRedditScan() {
  const userId = await getAuthUser();

  const { scanRedditForLeads } = await import("@/lib/reddit");

  const posts = await scanRedditForLeads();

  const existing = await db
    .select({ redditId: redditLeads.redditId })
    .from(redditLeads)
    .where(eq(redditLeads.userId, userId));

  const existingIds = new Set(existing.map((r) => r.redditId));
  const newPosts = posts.filter((p) => !existingIds.has(p.id));

  if (newPosts.length > 0) {
    await db.insert(redditLeads).values(
      newPosts.map((post) => ({
        userId,
        redditId: post.id,
        title: post.title,
        body: post.selftext || null,
        author: post.author,
        subreddit: post.subreddit,
        permalink: post.permalink,
        score: post.score,
        numComments: post.numComments,
        createdAt: new Date(post.createdUtc * 1000),
        status: "new",
      }))
    );
  }

  revalidatePath("/");
  return { scanned: posts.length, newFound: newPosts.length };
}
