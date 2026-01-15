import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function unauthorized() {
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="PSP Dashboard"',
    },
  });
}

export function middleware(req: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;

  // If creds are not set, do NOT block (avoids accidental lockout in dev).
  // In prod (Vercel) we will set both.
  if (!user || !pass) return NextResponse.next();

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) return unauthorized();

  try {
    const base64 = auth.slice("Basic ".length);
    const decoded = atob(base64);
    const idx = decoded.indexOf(":");
    if (idx === -1) return unauthorized();

    const inputUser = decoded.slice(0, idx);
    const inputPass = decoded.slice(idx + 1);

    if (inputUser !== user || inputPass !== pass) return unauthorized();

    return NextResponse.next();
  } catch {
    return unauthorized();
  }
}

// Protect only sensitive areas (accounting + invoice details/list)
export const config = {
  matcher: ["/accounting/:path*", "/invoices/:path*"],
};
