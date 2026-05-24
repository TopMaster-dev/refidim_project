import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify, SignJWT } from "jose";

const SESSION_COOKIE = "refidim_session";
// Mantenha em sincronia com IDLE_TIMEOUT_MIN em src/lib/auth.ts. Não importamos
// daquele arquivo porque middleware roda no edge runtime (sem Prisma/Node APIs).
const IDLE_TIMEOUT_MIN = 30;

function getSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret === "change-me-in-production") {
    return new TextEncoder().encode("dev-only-do-not-use-in-prod-please");
  }
  return new TextEncoder().encode(secret);
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
    sameSite: "lax" as const,
    maxAge: IDLE_TIMEOUT_MIN * 60,
    path: "/",
  };
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  let payload: { userId: string; email: string } | null = null;
  if (token) {
    try {
      const result = await jwtVerify(token, getSecret());
      if (
        typeof result.payload.userId === "string" &&
        typeof result.payload.email === "string"
      ) {
        payload = { userId: result.payload.userId, email: result.payload.email };
      }
    } catch {
      // Expirado ou inválido — payload fica null e o usuário cai em /login.
    }
  }

  const { pathname } = request.nextUrl;

  // Rotas protegidas — sem sessão válida, vai pra /login (e limpa cookie vencido).
  if (pathname.startsWith("/painel") && !payload) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    if (token) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  // Logado tentando acessar /login ou /cadastro → manda pro painel.
  if ((pathname === "/login" || pathname === "/cadastro") && payload) {
    return NextResponse.redirect(new URL("/painel", request.url));
  }

  // Sliding window: cada request autenticado renova o JWT por mais N minutos.
  // Resultado: usuário ativo nunca expira; idle > N min → cookie morre sozinho.
  if (payload) {
    const newToken = await new SignJWT({
      userId: payload.userId,
      email: payload.email,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(`${IDLE_TIMEOUT_MIN}m`)
      .sign(getSecret());

    const response = NextResponse.next();
    response.cookies.set(SESSION_COOKIE, newToken, cookieOptions());
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/painel/:path*", "/login", "/cadastro"],
};
