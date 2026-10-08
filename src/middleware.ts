import { NextResponse, type NextRequest } from "next/server";

// Hosts served through Railway's proxy, which terminates TLS and sets X-Forwarded-Proto.
// Railway's healthcheck (healthcheck.railway.app) and localhost are deliberately not listed.
const PUBLIC_HOST = /^(www\.)?michaeljportfolio\.me$|\.up\.railway\.app$/i;

function firstValue(header: string | null): string {
  return (header ?? "").split(",")[0].trim().toLowerCase();
}

export function middleware(request: NextRequest): NextResponse {
  const protocol = firstValue(request.headers.get("x-forwarded-proto"));
  const host = firstValue(request.headers.get("x-forwarded-host") ?? request.headers.get("host")).split(":")[0];

  if (protocol === "http" && PUBLIC_HOST.test(host)) {
    const target = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, `https://${host}`);
    return NextResponse.redirect(target, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
