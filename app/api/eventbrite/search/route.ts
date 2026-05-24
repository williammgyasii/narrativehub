import { auth } from "@/lib/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { searchEvents } from "@/lib/eventbrite";

export async function GET(request: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q");
  const location = searchParams.get("location") || "dc";
  const page = parseInt(searchParams.get("page") || "1");

  if (!q) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  const response = await searchEvents(q, location, page);

  if (!response.ok) {
    return NextResponse.json({ error: response.error }, { status: 500 });
  }

  return NextResponse.json({
    events: response.events,
    hasMore: response.hasMore,
    page: response.page,
  });
}
