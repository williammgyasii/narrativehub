import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

// ── Enums ──────────────────────────────────────────────

export const leadTypeEnum = pgEnum("lead_type", [
  "wedding",
  "corporate",
  "real_estate",
  "architectural",
]);

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "responded",
  "booked",
  "closed",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "deposit",
  "paid",
]);

export const outreachStatusEnum = pgEnum("outreach_status", [
  "draft",
  "sent",
  "opened",
  "replied",
]);

export const gearOwnershipEnum = pgEnum("gear_ownership", [
  "owned",
  "rented",
  "wishlist",
]);

export const expenseCategoryEnum = pgEnum("expense_category", [
  "gear_rental",
  "travel",
  "software",
  "insurance",
  "marketing",
  "other",
]);

// ── Tables ─────────────────────────────────────────────

export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  businessName: text("business_name"),
  leadType: leadTypeEnum("lead_type").notNull(),
  status: leadStatusEnum("status").notNull().default("new"),
  source: text("source").default("manual"),
  notes: text("notes"),
  lastContactedAt: timestamp("last_contacted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  eventType: text("event_type"),
  eventDate: timestamp("event_date").notNull(),
  location: text("location"),
  packagePrice: integer("package_price").default(0),
  paymentStatus: paymentStatusEnum("payment_status")
    .notNull()
    .default("unpaid"),
  gearChecklist: jsonb("gear_checklist")
    .$type<{ item: string; checked: boolean; rentalCost?: number; gearItemId?: string }[]>()
    .default([]),
  description: text("description"),
  clientRequests: text("client_requests"),
  moodboard: jsonb("moodboard")
    .$type<{ type: "image" | "url" | "note"; content: string; caption?: string }[]>()
    .default([]),
  paymentLog: jsonb("payment_log")
    .$type<{ date: string; label: string; amount?: number }[]>()
    .default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const gearItems = pgTable("gear_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  ownership: gearOwnershipEnum("ownership").notNull().default("wishlist"),
  purchasePrice: integer("purchase_price"),
  rentalPricePerDay: integer("rental_price_per_day"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  eventId: uuid("event_id").references(() => events.id, {
    onDelete: "set null",
  }),
  category: expenseCategoryEnum("category").notNull(),
  description: text("description").notNull(),
  amount: integer("amount").notNull(),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const outreachTemplates = pgTable("outreach_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  leadType: leadTypeEnum("lead_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const outreach = pgTable("outreach", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  leadId: uuid("lead_id")
    .references(() => leads.id, { onDelete: "cascade" })
    .notNull(),
  templateId: uuid("template_id").references(() => outreachTemplates.id, {
    onDelete: "set null",
  }),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  sentAt: timestamp("sent_at"),
  status: outreachStatusEnum("status").notNull().default("draft"),
  resendId: text("resend_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const redditLeads = pgTable("reddit_leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  redditId: text("reddit_id").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  author: text("author").notNull(),
  subreddit: text("subreddit").notNull(),
  permalink: text("permalink").notNull(),
  score: integer("score").default(0),
  numComments: integer("num_comments").default(0),
  createdAt: timestamp("created_at").notNull(),
  discoveredAt: timestamp("discovered_at").defaultNow().notNull(),
  status: text("status").notNull().default("new"),
});

export const photographerProfiles = pgTable("photographer_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  location: text("location"),
  businessName: text("business_name"),
  website: text("website"),
  instagram: text("instagram"),
  portfolioUrl: text("portfolio_url"),
  specialties: text("specialties"),
  yearsExperience: integer("years_experience"),
  bio: text("bio"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const skippedPlaces = pgTable("skipped_places", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  placeId: text("place_id").notNull(),
  name: text("name").notNull(),
  reason: text("reason").notNull().default("unreachable"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Types ──────────────────────────────────────────────

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type GearItem = typeof gearItems.$inferSelect;
export type NewGearItem = typeof gearItems.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type OutreachTemplate = typeof outreachTemplates.$inferSelect;
export type NewOutreachTemplate = typeof outreachTemplates.$inferInsert;
export type Outreach = typeof outreach.$inferSelect;
export type NewOutreach = typeof outreach.$inferInsert;
export type RedditLead = typeof redditLeads.$inferSelect;
export type NewRedditLead = typeof redditLeads.$inferInsert;
export type PhotographerProfile = typeof photographerProfiles.$inferSelect;
export type NewPhotographerProfile = typeof photographerProfiles.$inferInsert;
