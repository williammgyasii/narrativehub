import { auth } from "@/lib/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { scrapeOrganizerDetails } from "@/lib/eventbrite";

export async function GET(request: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const eventUrl = request.nextUrl.searchParams.get("url");
  if (!eventUrl || !eventUrl.includes("eventbrite.com")) {
    return NextResponse.json(
      { error: "Valid Eventbrite URL required" },
      { status: 400 }
    );
  }

  const details = await scrapeOrganizerDetails(eventUrl);

  return NextResponse.json({ organizer: details });
}
