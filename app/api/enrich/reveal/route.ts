import { auth } from "@/lib/auth/server";
import { NextRequest, NextResponse } from "next/server";
import { revealPersonEmail } from "@/lib/apollo";

export async function POST(request: NextRequest) {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { firstName, lastName, organizationName, domain } = body;

  if (!firstName || !lastName || !organizationName) {
    return NextResponse.json(
      { error: "firstName, lastName, and organizationName are required" },
      { status: 400 }
    );
  }

  const result = await revealPersonEmail(firstName, lastName, organizationName, domain);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({
    email: result.email,
    person: result.person,
  });
}
