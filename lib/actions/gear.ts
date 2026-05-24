"use server";

import { getAuthUser } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { gearItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const gearSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  ownership: z.enum(["owned", "rented", "wishlist"]),
  purchasePrice: z.string().optional().or(z.literal("")),
  rentalPricePerDay: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export async function addGearItem(formData: FormData) {
  const userId = await getAuthUser();

  const parsed = gearSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    ownership: formData.get("ownership"),
    purchasePrice: formData.get("purchasePrice"),
    rentalPricePerDay: formData.get("rentalPricePerDay"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await db.insert(gearItems).values({
    userId,
    name: parsed.data.name,
    category: parsed.data.category,
    ownership: parsed.data.ownership,
    purchasePrice: parsed.data.purchasePrice
      ? Math.round(parseFloat(parsed.data.purchasePrice) * 100)
      : null,
    rentalPricePerDay: parsed.data.rentalPricePerDay
      ? Math.round(parseFloat(parsed.data.rentalPricePerDay) * 100)
      : null,
    notes: parsed.data.notes || null,
  });

  revalidatePath("/gear");
}

export async function deleteGearItem(id: string) {
  const userId = await getAuthUser();

  await db
    .delete(gearItems)
    .where(and(eq(gearItems.id, id), eq(gearItems.userId, userId)));

  revalidatePath("/gear");
}
