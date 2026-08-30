import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "nb_session";

function secretKey(): Uint8Array {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "");
}

export async function middleware(request: Request) {
  const { pathname } = new URL(request.url);
  const token = request.headers.get("cookie")?.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1];

  let role: string | null = null;
  if (token && process.env.AUTH_SECRET) {
    try {
      const { payload } = await jwtVerify(token, secretKey());
      role = typeof payload.role === "string" ? payload.role : null;
    } catch {
      role = null;
    }
  }

  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAccountArea = pathname === "/account" || pathname.startsWith("/account/");
  const isCheckout = pathname.startsWith("/checkout");

  if ((isAdminArea || isAccountArea || isCheckout) && !role) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminArea && role !== "ADMIN" && role !== "MANAGER") {
    return NextResponse.rewrite(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/checkout/:path*"]
};
