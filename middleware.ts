import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Pages that need a signed-in user. API routes check auth themselves so they
// can answer with JSON instead of a sign-in redirect.
const PROTECTED_PAGES = ["/mock-interview", "/interview", "/report", "/account"];

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const isProtected = PROTECTED_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isProtected && !req.auth) {
    const signIn = new URL("/sign-in", req.nextUrl.origin);
    signIn.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(signIn);
  }
});

export const config = {
  matcher: ["/mock-interview/:path*", "/interview/:path*", "/report/:path*", "/account/:path*"],
};
