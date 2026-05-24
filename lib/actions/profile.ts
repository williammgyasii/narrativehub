"use server";

import { getAuthUserOrNull } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { photographerProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function upsertProfile(formData: FormData) {
  const userId = await getAuthUserOrNull();
  if (!userId) return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;

  if (!name?.trim() || !email?.trim()) {
    return { error: "Name and email are required" };
  }

  const data = {
    userId,
    name: name.trim(),
    email: email.trim(),
    phone: (formData.get("phone") as string)?.trim() || null,
    location: (formData.get("location") as string)?.trim() || null,
    businessName: (formData.get("businessName") as string)?.trim() || null,
    website: (formData.get("website") as string)?.trim() || null,
    instagram: (formData.get("instagram") as string)?.trim() || null,
    portfolioUrl: (formData.get("portfolioUrl") as string)?.trim() || null,
    specialties: (formData.get("specialties") as string)?.trim() || null,
    yearsExperience: formData.get("yearsExperience")
      ? parseInt(formData.get("yearsExperience") as string, 10)
      : null,
    bio: (formData.get("bio") as string)?.trim() || null,
    updatedAt: new Date(),
  };

  const existing = await db
    .select({ id: photographerProfiles.id })
    .from(photographerProfiles)
    .where(eq(photographerProfiles.userId, userId));

  if (existing.length > 0) {
    await db
      .update(photographerProfiles)
      .set(data)
      .where(eq(photographerProfiles.userId, userId));
  } else {
    await db.insert(photographerProfiles).values(data);
  }

  revalidatePath("/settings");
  return { success: true };
}
