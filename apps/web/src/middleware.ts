import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "refidim_session";

function getSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret === "change-me-in-production") {
    return new TextEncoder().encode("dev-only-do-not-use-in-prod-please");
  }
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  const isAuthenticated = await (async () => {
    if (!token) return false;
    try {
      await jwtVerify(token, getSecret());
      return true;
    } catch {
      return false;
    }
  })();

  const { pathname } = request.nextUrl;

  // Bloqueia rotas protegidas
  if (pathname.startsWith("/painel") && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redireciona usuários logados para fora de telas de auth
  if ((pathname === "/login" || pathname === "/cadastro") && isAuthenticated) {
    return NextResponse.redirect(new URL("/painel", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/painel/:path*", "/login", "/cadastro"],
};
