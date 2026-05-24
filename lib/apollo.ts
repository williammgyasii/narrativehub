import "server-only";

const APOLLO_API_KEY = process.env.APOLLO_API_KEY;

export interface ApolloPersonPreview {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  title?: string;
  city?: string;
  state?: string;
  country?: string;
  linkedinUrl?: string;
  hasEmail: boolean;
  organizationName?: string;
}

export interface ApolloPersonRevealed {
  id: string;
  email?: string;
  firstName: string;
  lastName: string;
  name: string;
  title?: string;
  organizationName?: string;
  linkedinUrl?: string;
}

export function isApolloConfigured(): boolean {
  return !!APOLLO_API_KEY;
}

export async function searchPeopleByCompany(
  companyName: string,
  location?: string
): Promise<{ ok: true; people: ApolloPersonPreview[] } | { ok: false; error: string }> {
  if (!APOLLO_API_KEY) {
    return { ok: false, error: "APOLLO_API_KEY is not configured" };
  }

  try {
    const body: Record<string, unknown> = {
      q_organization_name: companyName,
      page: 1,
      per_page: 10,
    };

    if (location) {
      body["person_locations[]"] = [location];
    }

    const res = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "x-api-key": APOLLO_API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: `Apollo API error: ${res.status} — ${err.slice(0, 200)}` };
    }

    const data = await res.json();
    const people: ApolloPersonPreview[] = (data.people || []).map(
      (p: Record<string, unknown>) => ({
        id: p.id as string,
        firstName: (p.first_name as string) || "",
        lastName: (p.last_name as string) || "",
        name: (p.name as string) || `${p.first_name || ""} ${p.last_name || ""}`.trim(),
        title: p.title as string | undefined,
        city: p.city as string | undefined,
        state: p.state as string | undefined,
        country: p.country as string | undefined,
        linkedinUrl: p.linkedin_url as string | undefined,
        hasEmail: !!(p.email || (p as Record<string, unknown>).has_email),
        organizationName: ((p.organization as Record<string, unknown>)?.name as string) || undefined,
      })
    );

    return { ok: true, people };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to search Apollo",
    };
  }
}

export async function revealPersonEmail(
  firstName: string,
  lastName: string,
  organizationName: string,
  domain?: string
): Promise<{ ok: true; email: string; person: ApolloPersonRevealed } | { ok: false; error: string }> {
  if (!APOLLO_API_KEY) {
    return { ok: false, error: "APOLLO_API_KEY is not configured" };
  }

  try {
    const body: Record<string, unknown> = {
      first_name: firstName,
      last_name: lastName,
      organization_name: organizationName,
    };

    if (domain) {
      body.domain = domain;
    }

    const res = await fetch("https://api.apollo.io/api/v1/people/match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "x-api-key": APOLLO_API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: `Apollo API error: ${res.status} — ${err.slice(0, 200)}` };
    }

    const data = await res.json();
    const p = data.person;

    if (!p) {
      return { ok: false, error: "Person not found in Apollo" };
    }

    if (!p.email) {
      return { ok: false, error: "No email found for this person" };
    }

    return {
      ok: true,
      email: p.email,
      person: {
        id: p.id,
        email: p.email,
        firstName: p.first_name || firstName,
        lastName: p.last_name || lastName,
        name: p.name || `${firstName} ${lastName}`,
        title: p.title,
        organizationName: p.organization?.name || organizationName,
        linkedinUrl: p.linkedin_url,
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to reveal email",
    };
  }
}
