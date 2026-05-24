import "server-only";

export interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  types: string[];
}

export type PlacesResponse =
  | { ok: true; results: PlaceResult[]; nextPageToken?: string }
  | { ok: false; error: string; notConfigured?: boolean };

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export async function searchPlaces(
  query: string,
  location: string = "39.2037,-76.8610",
  radius: number = 40000,
  pageToken?: string
): Promise<PlacesResponse> {
  if (!GOOGLE_API_KEY) {
    return {
      ok: false,
      error: "GOOGLE_PLACES_API_KEY is not configured. Add it to your .env.local file.",
      notConfigured: true,
    };
  }

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/textsearch/json"
  );

  if (pageToken) {
    url.searchParams.set("pagetoken", pageToken);
  } else {
    url.searchParams.set("query", query);
    url.searchParams.set("location", location);
    url.searchParams.set("radius", radius.toString());
  }
  url.searchParams.set("key", GOOGLE_API_KEY);

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    const data = await res.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return { ok: false, error: `Google Places API error: ${data.status}` };
    }

    const results: PlaceResult[] = (data.results || []).map(
      (place: {
        place_id: string;
        name: string;
        formatted_address: string;
        formatted_phone_number?: string;
        website?: string;
        rating?: number;
        user_ratings_total?: number;
        types: string[];
      }) => ({
        placeId: place.place_id,
        name: place.name,
        address: place.formatted_address,
        phone: place.formatted_phone_number,
        website: place.website,
        rating: place.rating,
        reviewCount: place.user_ratings_total,
        types: place.types,
      })
    );

    return {
      ok: true,
      results,
      nextPageToken: data.next_page_token,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to search Google Places",
    };
  }
}

export async function getPlaceDetails(placeId: string): Promise<{
  phone?: string;
  website?: string;
  name: string;
  address: string;
} | null> {
  if (!GOOGLE_API_KEY) return null;

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/details/json"
  );
  url.searchParams.set("place_id", placeId);
  url.searchParams.set(
    "fields",
    "name,formatted_address,formatted_phone_number,website"
  );
  url.searchParams.set("key", GOOGLE_API_KEY);

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
  const data = await res.json();

  return {
    name: data.result?.name,
    address: data.result?.formatted_address,
    phone: data.result?.formatted_phone_number,
    website: data.result?.website,
  };
}
