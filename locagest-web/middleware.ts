import { NextResponse, type NextRequest } from "next/server";

// F03 : redirection selon la connexion et le rôle.
// Les données restent protégées par l'API (Sanctum + policies) : ceci n'est qu'un confort de navigation.
const AREAS: Record<string, string[]> = { "/owner": ["owner", "manager"], "/tenant": ["tenant"], "/profile": ["owner", "manager", "tenant", "admin"] };
const GUEST_ONLY = ["/login", "/register", "/forgot-password"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const role = req.cookies.get("lg_role")?.value;
  const home = role === "tenant" ? "/tenant" : "/owner";

  if (pathname === "/") {
    return NextResponse.redirect(new URL(role ? home : "/login", req.url));
  }
  if (GUEST_ONLY.some((p) => pathname.startsWith(p)) && role) {
    return NextResponse.redirect(new URL(home, req.url));
  }
  const area = Object.keys(AREAS).find((p) => pathname === p || pathname.startsWith(p + "/"));
  if (area) {
    if (!role) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (!AREAS[area].includes(role)) {
      return NextResponse.redirect(new URL(home, req.url));
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next|favicon.ico|.*\\..*).*)"] };
