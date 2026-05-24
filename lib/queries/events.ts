import "server-only";

import { getAuthUserOrNull } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { events, leads } from "@/lib/db/schema";
import { eq, and, gte, desc, asc } from "drizzle-orm";
import type { Event, Lead } from "@/lib/db/schema";

export async function getEvents(): Promise<Event[]> {
  const userId = await getAuthUserOrNull();
  if (!userId) return [];

  return db
    .select()
    .from(events)
    .where(eq(events.userId, userId))
    .orderBy(desc(events.eventDate));
}

export async function getEventById(
  id: string
): Promise<(Event & { lead?: Lead | null }) | undefined> {
  const userId = await getAuthUserOrNull();
  if (!userId) return undefined;

  const results = await db
    .select()
    .from(events)
    .leftJoin(leads, eq(events.leadId, leads.id))
    .where(and(eq(events.id, id), eq(events.userId, userId)));

  if (results.length === 0) return undefined;

  const row = results[0];
  return {
    ...row.events,
    lead: row.leads,
  };
}

export async function getEventsByLeadId(leadId: string): Promise<Event[]> {
  const userId = await getAuthUserOrNull();
  if (!userId) return [];

  return db
    .select()
    .from(events)
    .where(and(eq(events.userId, userId), eq(events.leadId, leadId)))
    .orderBy(desc(events.eventDate));
}

export async function getUpcomingEvents(limit = 5): Promise<Event[]> {
  const userId = await getAuthUserOrNull();
  if (!userId) return [];

  return db
    .select()
    .from(events)
    .where(
      and(eq(events.userId, userId), gte(events.eventDate, new Date()))
    )
    .orderBy(asc(events.eventDate))
    .limit(limit);
}
