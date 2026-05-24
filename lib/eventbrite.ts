import "server-only";

export interface EventbriteEvent {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  startTime?: string;
  endDate?: string;
  venueName?: string;
  venueAddress?: string;
  organizerName?: string;
  url: string;
  image?: string;
}

export type EventbriteResponse =
  | { ok: true; events: EventbriteEvent[]; hasMore: boolean; page: number }
  | { ok: false; error: string };

const locationSlugs: Record<string, string> = {
  dc: "dc--washington",
  baltimore: "md--baltimore",
  columbia: "md--columbia",
  arlington: "va--arlington",
  alexandria: "va--alexandria",
  bethesda: "md--bethesda",
  annapolis: "md--annapolis",
};

export async function searchEvents(
  query: string,
  location: string = "dc",
  page: number = 1
): Promise<EventbriteResponse> {
  const slug = locationSlugs[location] || locationSlugs["dc"];
  const searchTerm = query.trim().toLowerCase().replace(/\s+/g, "-");

  let url = `https://www.eventbrite.com/d/${slug}/${encodeURIComponent(searchTerm)}/`;
  if (page > 1) {
    url += `?page=${page}`;
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      next: { revalidate: 1800 },
    });

    if (!res.ok) {
      return { ok: false, error: `Eventbrite returned status ${res.status}` };
    }

    const html = await res.text();
    const events = parseJsonLd(html);
    enrichWithTimes(events, html);

    return {
      ok: true,
      events,
      hasMore: events.length >= 18,
      page,
    };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "Failed to fetch Eventbrite events",
    };
  }
}

/**
 * Eventbrite search pages embed time info in the HTML but NOT in JSON-LD
 * (which only has date-only strings like "2026-07-11").
 * We scan the HTML for common time patterns near event URLs to extract times.
 */
function enrichWithTimes(events: EventbriteEvent[], html: string) {
  // Pattern: "Saturday, July 11 • 12:30 PM" or "Fri, May 30, 7:00 PM"
  const timePattern = /(\d{1,2}:\d{2}\s*(?:AM|PM))\s*(?:[-–]\s*(\d{1,2}:\d{2}\s*(?:AM|PM)))?/gi;

  for (const event of events) {
    if (!event.url) continue;

    // Find the event's ID/URL in the HTML, then look nearby for time
    const eventIdMatch = event.url.match(/(\d+)(?:\?|$)/);
    if (!eventIdMatch) continue;
    const eventId = eventIdMatch[1];

    // Look for a chunk of HTML around the event link
    const linkIdx = html.indexOf(eventId);
    if (linkIdx === -1) continue;

    // Search within a window around the event reference
    const start = Math.max(0, linkIdx - 1500);
    const end = Math.min(html.length, linkIdx + 1500);
    const chunk = html.slice(start, end);

    const timeMatch = timePattern.exec(chunk);
    if (timeMatch) {
      event.startTime = timeMatch[1].trim();
    }
    timePattern.lastIndex = 0;
  }
}

export interface OrganizerDetails {
  name: string;
  website?: string;
  facebook?: string;
  twitter?: string;
  instagram?: string;
  description?: string;
}

/**
 * Scrape an individual Eventbrite event page for organizer details
 * (website, social links) that aren't available in search results.
 */
export async function scrapeOrganizerDetails(
  eventUrl: string
): Promise<OrganizerDetails | null> {
  try {
    const res = await fetch(eventUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) return null;
    const html = await res.text();

    // Extract from JSON-LD on the event page (more detailed than search page)
    const scriptRegex =
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    let organizerName = "";

    while ((match = scriptRegex.exec(html)) !== null) {
      try {
        const data = JSON.parse(match[1]);
        if (data["@type"] === "Event" && data.organizer) {
          organizerName = data.organizer.name || "";
          const orgUrl = data.organizer.url;
          if (orgUrl && !orgUrl.includes("eventbrite.com")) {
            return {
              name: organizerName,
              website: orgUrl,
            };
          }
        }
      } catch {
        continue;
      }
    }

    // Look for organizer website link in the HTML
    const websitePatterns = [
      /href="(https?:\/\/(?!(?:www\.)?(?:eventbrite|facebook|twitter|instagram|youtube|tiktok|linkedin)\.com)[^"]+)"[^>]*>\s*(?:Website|Visit\s+Website|Official\s+Site)/gi,
      /class="[^"]*organizer[^"]*"[\s\S]{0,2000}?href="(https?:\/\/(?!(?:www\.)?(?:eventbrite|facebook|twitter|instagram|youtube|tiktok|linkedin)\.com)[^"]+)"/gi,
    ];

    let website: string | undefined;
    for (const pattern of websitePatterns) {
      const m = pattern.exec(html);
      if (m) {
        website = m[1];
        break;
      }
    }

    // Social links from organizer section
    const fbMatch = html.match(
      /href="(https?:\/\/(?:www\.)?facebook\.com\/[^"]+)"/i
    );
    const twMatch = html.match(
      /href="(https?:\/\/(?:www\.)?twitter\.com\/[^"]+)"/i
    );
    const igMatch = html.match(
      /href="(https?:\/\/(?:www\.)?instagram\.com\/[^"]+)"/i
    );

    // Organizer description
    const descMatch = html.match(
      /organizer-description[^>]*>([\s\S]*?)<\//i
    );
    const description = descMatch
      ? descMatch[1].replace(/<[^>]+>/g, "").trim().slice(0, 300)
      : undefined;

    if (!website && !fbMatch && !twMatch && !igMatch) return null;

    return {
      name: organizerName || "Unknown Organizer",
      website,
      facebook: fbMatch?.[1],
      twitter: twMatch?.[1],
      instagram: igMatch?.[1],
      description,
    };
  } catch {
    return null;
  }
}

function parseJsonLd(html: string): EventbriteEvent[] {
  const events: EventbriteEvent[] = [];
  const scriptRegex =
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);

      if (
        data["@type"] === "ItemList" &&
        Array.isArray(data.itemListElement)
      ) {
        for (const item of data.itemListElement) {
          const event = item.item || item;
          if (!event || event["@type"] !== "Event") continue;

          const loc = event.location;
          let venueName: string | undefined;
          let venueAddress: string | undefined;

          if (loc) {
            if (loc["@type"] === "Place") {
              venueName = loc.name;
              const addr = loc.address;
              if (typeof addr === "string") {
                venueAddress = addr;
              } else if (addr?.streetAddress) {
                venueAddress = [
                  addr.streetAddress,
                  addr.addressLocality,
                  addr.addressRegion,
                ]
                  .filter(Boolean)
                  .join(", ");
              }
            } else if (loc["@type"] === "VirtualLocation") {
              venueName = "Online Event";
              venueAddress = loc.url;
            }
          }

          const eventUrl = event.url || "";
          const idMatch = eventUrl.match(/(\d+)(?:\?|$)/);

          events.push({
            id: idMatch?.[1] || eventUrl || String(Math.random()),
            name: event.name || "Untitled Event",
            description: event.description?.slice(0, 200),
            startDate: event.startDate || "",
            endDate: event.endDate,
            venueName,
            venueAddress,
            organizerName: event.organizer?.name,
            url: eventUrl,
            image:
              typeof event.image === "string" ? event.image : event.image?.url,
          });
        }
      }
    } catch {
      continue;
    }
  }

  return events;
}
