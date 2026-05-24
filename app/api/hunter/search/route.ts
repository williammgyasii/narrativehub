import { auth } from "@/lib/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { findEmails } from "@/lib/hunter";

export async function GET(request: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const domain = searchParams.get("domain");

  if (!domain) {
    return NextResponse.json(
      { error: "Query parameter 'domain' is required" },
      { status: 400 }
    );
  }

  const response = await findEmails(domain);

  if (!response.ok) {
    const status = response.notConfigured ? 503 : 500;
    return NextResponse.json(
      { error: response.error, notConfigured: response.notConfigured },
      { status }
    );
  }

  return NextResponse.json({ results: response.results });
}
