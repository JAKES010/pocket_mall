import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/wallet", "/orders", "/checkout", "/messages", "/sell"];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const needsAuth = PROTECTED.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!needsAuth) return NextResponse.next();

  const token = request.cookies.get("orderdesk_session")?.value;
  if (token) return NextResponse.next();

  const signIn = new URL("/sign-in", request.url);
  signIn.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(signIn);
}

export const config = {
  matcher: [
    "/wallet/:path*",
    "/orders/:path*",
    "/checkout/:path*",
    "/messages/:path*",
    "/sell/:path*",
  ],
};
