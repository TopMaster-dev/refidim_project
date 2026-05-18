import { NextResponse, type NextRequest } from "next/server";

/**
 * Limpa o cookie de sessão e redireciona para /login.
 * Usado quando o JWT está válido mas o usuário não existe mais no banco
 * (ex: DB foi resetado mas o navegador ainda tem o cookie).
 *
 * Sem isso, o middleware libera /painel (JWT válido) mas o layout
 * redireciona pra /login porque getCurrentUser retorna null, e o
 * middleware redireciona /login → /painel porque JWT é válido → loop.
 */
export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/login", req.url));
  res.cookies.delete("refidim_session");
  return res;
}
