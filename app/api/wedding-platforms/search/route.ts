import { auth } from "@/lib/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { searchTheKnot } from "@/lib/apify";

export async function GET(request: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category");
  const location = searchParams.get("location");
  const maxItems = parseInt(searchParams.get("maxItems") || "30", 10);

  if (!category || !location) {
    return NextResponse.json(
      { error: "category and location are required" },
      { status: 400 }
    );
  }

  try {
    const vendors = await searchTheKnot(category, location, maxItems);
    return NextResponse.json({ vendors, total: vendors.length });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
