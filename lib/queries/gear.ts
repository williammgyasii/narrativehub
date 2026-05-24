import "server-only";

import { getAuthUserOrNull } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { gearItems, events } from "@/lib/db/schema";
import { eq, desc, gte, and } from "drizzle-orm";

export async function getGearItems() {
  const userId = await getAuthUserOrNull();
  if (!userId) return [];

  return db
    .select()
    .from(gearItems)
    .where(eq(gearItems.userId, userId))
    .orderBy(desc(gearItems.createdAt));
}

export interface GearAllocation {
  eventId: string;
  eventTitle: string;
  eventDate: Date;
}

export async function getGearAllocations(): Promise<
  Record<string, GearAllocation[]>
> {
  const userId = await getAuthUserOrNull();
  if (!userId) return {};

  const upcomingEvents = await db
    .select()
    .from(events)
    .where(
      and(eq(events.userId, userId), gte(events.eventDate, new Date()))
    );

  const allocations: Record<string, GearAllocation[]> = {};

  for (const event of upcomingEvents) {
    const checklist =
      (event.gearChecklist as { gearItemId?: string }[] | null) || [];
    for (const item of checklist) {
      if (item.gearItemId) {
        if (!allocations[item.gearItemId]) {
          allocations[item.gearItemId] = [];
        }
        allocations[item.gearItemId].push({
          eventId: event.id,
          eventTitle: event.title,
          eventDate: event.eventDate,
        });
      }
    }
  }

  return allocations;
}
