import "server-only";

import { getAuthUserOrNull } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { photographerProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { PhotographerProfile } from "@/lib/db/schema";

export async function getProfile(): Promise<PhotographerProfile | undefined> {
  const userId = await getAuthUserOrNull();
  if (!userId) return undefined;

  const [profile] = await db
    .select()
    .from(photographerProfiles)
    .where(eq(photographerProfiles.userId, userId));

  return profile;
}
