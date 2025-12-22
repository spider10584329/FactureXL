import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Check if user is authenticated
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const role = token.role as Role;

    // Role-based route protection matching Angular AuthGuard

    // SUPER_ADMIN - only companies and dashboard
    if (role === "SUPER_ADMIN") {
      const allowedPaths = ["/", "/companies"];
      if (!allowedPaths.some((p) => path === p || path.startsWith(p + "/"))) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    // CLIENT - limited access
    if (role === "CLIENT") {
      const allowedPaths = ["/", "/invoices", "/profile"];
      if (!allowedPaths.some((p) => path === p || path.startsWith(p + "/"))) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    // ADMIN - extended access
    if (role === "ADMIN") {
      const allowedPaths = [
        "/",
        "/clients",
        "/employees",
        "/invoices",
        "/avoirs",
        "/devis",
        "/transfers",
        "/taxes",
        "/subscription-invoices",
        "/profile",
      ];
      if (!allowedPaths.some((p) => path === p || path.startsWith(p + "/"))) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    // MANAGER, EMPLOYEE - invoices, credits, quotes, dashboard and info
    if (role === "MANAGER" || role === "EMPLOYEE") {
      const allowedPaths = ["/", "/invoices", "/avoirs", "/devis", "/subscription-invoices", "/profile"];
      if (!allowedPaths.some((p) => path === p || path.startsWith(p + "/"))) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    // OWNER - full access (no restrictions)

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

// Protect all routes except public ones
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login, forgot-password, reset-password (auth pages)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|login|forgot-password|reset-password).*)",
  ],
};
