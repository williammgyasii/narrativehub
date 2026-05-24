import "server-only";

export interface HunterResult {
  email: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  confidence: number;
}

export type HunterResponse =
  | { ok: true; results: HunterResult[] }
  | { ok: false; error: string; notConfigured?: boolean };

const HUNTER_API_KEY = process.env.HUNTER_API_KEY;

export function isHunterConfigured(): boolean {
  return !!HUNTER_API_KEY;
}

export async function findEmails(domain: string): Promise<HunterResponse> {
  if (!HUNTER_API_KEY) {
    return {
      ok: false,
      error: "HUNTER_API_KEY is not configured. Add it to your .env.local file.",
      notConfigured: true,
    };
  }

  const url = new URL("https://api.hunter.io/v2/domain-search");
  url.searchParams.set("domain", domain);
  url.searchParams.set("api_key", HUNTER_API_KEY);

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
    const data = await res.json();

    if (data.errors) {
      return {
        ok: false,
        error: data.errors[0]?.details || "Hunter.io error",
      };
    }

    const results: HunterResult[] = (data.data?.emails || []).map(
      (email: {
        value: string;
        first_name?: string;
        last_name?: string;
        position?: string;
        confidence: number;
      }) => ({
        email: email.value,
        firstName: email.first_name,
        lastName: email.last_name,
        position: email.position,
        confidence: email.confidence,
      })
    );

    return { ok: true, results };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to search Hunter.io",
    };
  }
}

export async function verifyEmail(
  email: string
): Promise<{ status: string; score: number } | null> {
  if (!HUNTER_API_KEY) return null;

  const url = new URL("https://api.hunter.io/v2/email-verifier");
  url.searchParams.set("email", email);
  url.searchParams.set("api_key", HUNTER_API_KEY);

  try {
    const res = await fetch(url.toString());
    const data = await res.json();
    return {
      status: data.data?.status || "unknown",
      score: data.data?.score || 0,
    };
  } catch {
    return null;
  }
}
