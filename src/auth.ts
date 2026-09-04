import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import type { PerfilAcesso } from "@/generated/prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      nome: string;
      email: string;
      perfil: PerfilAcesso;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    nome: string;
    perfil: PerfilAcesso;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: {},
        senha: {},
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const senha = credentials?.senha;
        if (typeof email !== "string" || typeof senha !== "string") return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.ativo) return null;

        const senhaValida = await bcrypt.compare(senha, user.senhaHash);
        if (!senhaValida) return null;

        return { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id as string;
        token.nome = (user as { nome: string }).nome;
        token.perfil = (user as { perfil: PerfilAcesso }).perfil;
      }
      return token;
    },
    session: ({ session, token }) => {
      session.user.id = token.id;
      session.user.nome = token.nome;
      session.user.perfil = token.perfil;
      return session;
    },
  },
});
