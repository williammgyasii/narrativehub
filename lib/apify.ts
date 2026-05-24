import "server-only";

const APIFY_API_KEY = process.env.APIFY_API_KEY;
const APIFY_BASE = "https://api.apify.com/v2";

// The Knot Marketplace Scraper by kawsar
const THEKNOT_ACTOR_ID = "kawsar~the-knot-marketplace-scraper";

export interface WeddingVendor {
  name: string;
  location: string;
  website?: string;
  phone?: string;
  email?: string;
  rating?: number;
  reviewCount?: number;
  priceTier?: string;
  category: string;
  platform: "theknot" | "weddingwire";
  profileUrl: string;
  bio?: string;
}

interface TheKnotResult {
  vendorName?: string;
  name?: string;
  location?: string;
  serviceArea?: string;
  vendorUrl?: string;
  url?: string;
  website?: string;
  phone?: string;
  email?: string;
  rating?: number;
  starRating?: number;
  reviewCount?: number;
  numberOfReviews?: number;
  priceTier?: string;
  priceRange?: string;
  bio?: string;
  description?: string;
  category?: string;
}

function normalizeTheKnotResult(raw: TheKnotResult): WeddingVendor {
  return {
    name: raw.vendorName || raw.name || "Unknown",
    location: raw.location || raw.serviceArea || "",
    website: raw.website || undefined,
    phone: raw.phone || undefined,
    email: raw.email || undefined,
    rating: raw.rating || raw.starRating || undefined,
    reviewCount: raw.reviewCount || raw.numberOfReviews || undefined,
    priceTier: raw.priceTier || raw.priceRange || undefined,
    category: raw.category || "venue",
    platform: "theknot",
    profileUrl: raw.vendorUrl || raw.url || "",
    bio: raw.bio || raw.description || undefined,
  };
}

async function runActorSync(
  actorId: string,
  input: Record<string, unknown>,
  timeoutSecs = 120
): Promise<unknown[]> {
  if (!APIFY_API_KEY) throw new Error("APIFY_API_KEY not configured");

  const runUrl = `${APIFY_BASE}/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_API_KEY}&timeout=${timeoutSecs}`;

  const res = await fetch(runUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify error (${res.status}): ${text.slice(0, 200)}`);
  }

  return res.json();
}

export async function searchTheKnot(
  category: string,
  location: string,
  maxItems = 50
): Promise<WeddingVendor[]> {
  const input = {
    category,
    location,
    maxPages: 3,
    maxItems,
  };

  const results = (await runActorSync(
    THEKNOT_ACTOR_ID,
    input,
    180
  )) as TheKnotResult[];

  return results.map(normalizeTheKnotResult);
}

export async function searchTheKnotByUrl(
  urls: string[],
  maxItems = 50
): Promise<WeddingVendor[]> {
  const input = {
    startUrls: urls,
    maxPages: 3,
    maxItems,
  };

  const results = (await runActorSync(
    THEKNOT_ACTOR_ID,
    input,
    180
  )) as TheKnotResult[];

  return results.map(normalizeTheKnotResult);
}

// Pre-built Maryland search URLs for The Knot
export const MARYLAND_SEARCHES = {
  venues: {
    label: "Wedding Venues",
    category: "wedding-reception-venues",
    locations: [
      { slug: "baltimore-md", label: "Baltimore" },
      { slug: "columbia-md", label: "Columbia" },
      { slug: "annapolis-md", label: "Annapolis" },
      { slug: "washington-dc", label: "Washington DC" },
      { slug: "frederick-md", label: "Frederick" },
      { slug: "silver-spring-md", label: "Silver Spring" },
    ],
  },
  planners: {
    label: "Wedding Planners",
    category: "wedding-planners",
    locations: [
      { slug: "baltimore-md", label: "Baltimore" },
      { slug: "columbia-md", label: "Columbia" },
      { slug: "washington-dc", label: "Washington DC" },
    ],
  },
  coordinators: {
    label: "Event Coordinators",
    category: "day-of-wedding-coordinators",
    locations: [
      { slug: "baltimore-md", label: "Baltimore" },
      { slug: "washington-dc", label: "Washington DC" },
    ],
  },
  florists: {
    label: "Florists",
    category: "wedding-florists",
    locations: [
      { slug: "baltimore-md", label: "Baltimore" },
      { slug: "columbia-md", label: "Columbia" },
      { slug: "washington-dc", label: "Washington DC" },
    ],
  },
} as const;
