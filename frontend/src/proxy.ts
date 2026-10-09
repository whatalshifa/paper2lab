import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Adds the shared secret to every /api request before Next forwards it to the API (see the
 * rewrite in next.config.ts). The API refuses /api requests without it, so nobody can skip the
 * website and call the API directly with a made-up address. Without API_PROXY_SECRET (local
 * development) nothing is added.
 */
export function proxy(request: NextRequest) {
  const secret = process.env.API_PROXY_SECRET;
  const headers = new Headers(request.headers);
  if (secret) headers.set("x-p2l-proxy", secret);
  else headers.delete("x-p2l-proxy");
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: "/api/:path*" };
