import "server-only";

export interface ScrapedContact {
  email: string;
  name?: string;
  position?: string;
  confidence: number;
  source: "website";
}

const EMAIL_REGEX =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const MAILTO_REGEX =
  /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;

const HREF_EMAIL_REGEX =
  /href=["']mailto:([^"'?]+)/gi;

const JSON_LD_EMAIL_REGEX =
  /"email"\s*:\s*"([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})"/gi;

const GENERIC_PREFIXES = [
  "noreply",
  "no-reply",
  "donotreply",
  "mailer-daemon",
  "postmaster",
  "webmaster",
  "admin",
  "support",
  "help",
  "abuse",
  "spam",
  "unsubscribe",
];

const PERSONAL_BOOST_PREFIXES = [
  "info",
  "contact",
  "hello",
  "inquiries",
  "bookings",
  "booking",
  "events",
  "event",
  "sales",
  "photography",
  "media",
  "reservations",
  "weddings",
  "catering",
  "rentals",
];

const PATHS_TO_TRY = [
  "",
  "/contact",
  "/contact-us",
  "/contactus",
  "/about",
  "/about-us",
  "/aboutus",
  "/team",
  "/connect",
  "/reach-us",
  "/get-in-touch",
  "/info",
  "/inquire",
  "/inquiry",
  "/book",
  "/booking",
  "/weddings",
  "/events",
];

function isJunkEmail(email: string): boolean {
  if (/\.(png|jpg|jpeg|gif|svg|webp|css|js|ico|woff|woff2|ttf|eot)$/i.test(email)) return true;
  if (email.includes("example.com")) return true;
  if (email.includes("sentry.io")) return true;
  if (email.includes("wixpress.com")) return true;
  if (email.includes("squarespace.com")) return true;
  if (email.includes("wordpress.com") && !email.includes("@wordpress.com")) return true;
  if (email.length > 60) return true;
  return false;
}

function scoreEmail(email: string): number {
  const prefix = email.split("@")[0].toLowerCase();
  const domain = email.split("@")[1]?.toLowerCase() || "";

  if (GENERIC_PREFIXES.some((g) => prefix === g)) return 20;

  // Gmail/Yahoo/Outlook addresses used by small businesses are high value
  if (["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"].includes(domain)) {
    return 70;
  }

  if (PERSONAL_BOOST_PREFIXES.some((p) => prefix === p || prefix.startsWith(p))) return 65;

  if (/^[a-z]+\.[a-z]+$/.test(prefix)) return 75;
  if (/^[a-z]{2,}$/.test(prefix) && prefix.length > 3) return 60;

  return 50;
}

function extractEmails(html: string): Set<string> {
  const emailSet = new Set<string>();

  const plainMatches = html.match(EMAIL_REGEX) || [];
  for (const email of plainMatches) {
    emailSet.add(email.toLowerCase());
  }

  let match: RegExpExecArray | null;

  MAILTO_REGEX.lastIndex = 0;
  while ((match = MAILTO_REGEX.exec(html)) !== null) {
    emailSet.add(match[1].toLowerCase());
  }

  HREF_EMAIL_REGEX.lastIndex = 0;
  while ((match = HREF_EMAIL_REGEX.exec(html)) !== null) {
    emailSet.add(match[1].toLowerCase());
  }

  JSON_LD_EMAIL_REGEX.lastIndex = 0;
  while ((match = JSON_LD_EMAIL_REGEX.exec(html)) !== null) {
    emailSet.add(match[1].toLowerCase());
  }

  // HTML entities decoded (&#64; = @, &#46; = .)
  const decoded = html.replace(/&#64;/g, "@").replace(/&#46;/g, ".");
  const decodedMatches = decoded.match(EMAIL_REGEX) || [];
  for (const email of decodedMatches) {
    emailSet.add(email.toLowerCase());
  }

  return emailSet;
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeout);
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) return null;

    const text = await res.text();
    return text.slice(0, 300_000);
  } catch {
    return null;
  }
}

export async function scrapeContacts(
  websiteUrl: string
): Promise<ScrapedContact[]> {
  let baseUrl: string;
  try {
    const parsed = new URL(
      websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`
    );
    baseUrl = `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    return [];
  }

  const allEmails = new Set<string>();

  // Fetch pages in parallel, first batch (most common paths)
  const priorityPaths = PATHS_TO_TRY.slice(0, 8);
  const secondaryPaths = PATHS_TO_TRY.slice(8);

  const priorityFetches = priorityPaths.map(async (path) => {
    const html = await fetchPage(`${baseUrl}${path}`);
    if (!html) return;
    const found = extractEmails(html);
    for (const email of found) allEmails.add(email);
  });

  await Promise.all(priorityFetches);

  // Only try secondary paths if we found nothing yet
  if (allEmails.size === 0) {
    const secondaryFetches = secondaryPaths.map(async (path) => {
      const html = await fetchPage(`${baseUrl}${path}`);
      if (!html) return;
      const found = extractEmails(html);
      for (const email of found) allEmails.add(email);
    });
    await Promise.all(secondaryFetches);
  }

  const contacts: ScrapedContact[] = Array.from(allEmails)
    .filter((email) => !isJunkEmail(email))
    .map((email) => ({
      email,
      confidence: scoreEmail(email),
      source: "website" as const,
    }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);

  return contacts;
}
