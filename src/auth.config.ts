import type { NextAuthConfig } from "next-auth";

const APP_PATH_PREFIXES = [
  "/dashboard",
  "/projetos",
  "/pesquisa",
  "/notificacoes",
  "/perfil",
];

// Config "edge-safe": nao importa Prisma nem providers com dependencias Node.
// E usada pelo middleware para decidir acesso sem correr no runtime Node.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAppRoute = APP_PATH_PREFIXES.some((prefix) =>
        nextUrl.pathname.startsWith(prefix),
      );

      if (isAppRoute) return isLoggedIn;

      if (
        isLoggedIn &&
        (nextUrl.pathname === "/login" || nextUrl.pathname === "/registo")
      ) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
