import { auth } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import { getTemplates } from "@/lib/queries/outreach";

export async function GET() {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templates = await getTemplates();
  return NextResponse.json({ templates });
}
