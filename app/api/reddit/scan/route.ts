import { auth } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redditLeads } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { scanRedditForLeads } from "@/lib/reddit";

export async function POST() {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
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

  return NextResponse.json({
    scanned: posts.length,
    newFound: newPosts.length,
  });
}
