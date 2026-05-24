import { auth } from "@/lib/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { searchPlaces } from "@/lib/google-places";

export async function GET(request: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q");
  const location = searchParams.get("location") || undefined;
  const radius = searchParams.get("radius")
    ? parseInt(searchParams.get("radius")!)
    : undefined;
  const pageToken = searchParams.get("pageToken") || undefined;

  if (!q && !pageToken) {
    return NextResponse.json(
      { error: "Query parameter 'q' or 'pageToken' is required" },
      { status: 400 }
    );
  }

  const response = await searchPlaces(q || "", location, radius, pageToken);

  if (!response.ok) {
    const status = response.notConfigured ? 503 : 500;
    return NextResponse.json(
      { error: response.error, notConfigured: response.notConfigured },
      { status }
    );
  }

  return NextResponse.json({
    results: response.results,
    nextPageToken: response.nextPageToken,
  });
}
