import type { NextAuthConfig } from "next-auth";

// Configuração "edge-safe": nenhuma dependência de Prisma/bcrypt aqui, pois
// este arquivo também é importado pelo middleware (Edge Runtime), que não
// suporta módulos Node.js nativos. O provider Credentials (que acessa o
// banco) é adicionado separadamente em src/auth.ts, usado só em rotas
// Node.js (server actions, route handlers, server components).
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = request.nextUrl.pathname.startsWith("/login");

      if (!isLoggedIn && !isLoginPage) return false;
      if (isLoggedIn && isLoginPage) {
        return Response.redirect(new URL("/", request.nextUrl));
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
