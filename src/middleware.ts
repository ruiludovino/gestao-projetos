import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Instancia leve (sem PrismaAdapter/providers Node) para correr no Edge runtime do middleware.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
