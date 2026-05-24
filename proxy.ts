import { auth } from "@/lib/auth/server";
import { NextRequest } from "next/server";

const authMiddleware = auth.middleware({
  loginUrl: "/auth/sign-in",
});

export default function proxy(request: NextRequest) {
  if (request.headers.has("Next-Action")) {
    return;
  }
  return authMiddleware(request);
}

export const config = {
  matcher: [
    "/",
    "/leads/:path*",
    "/lead-finder/:path*",
    "/events/:path*",
    "/gear/:path*",
    "/outreach/:path*",
    "/finances/:path*",
    "/account/:path*",
  ],
};
