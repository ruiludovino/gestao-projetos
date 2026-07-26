import type { ReactNode } from "react";
import Image from "next/image";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Image
            src="/logo.png"
            alt=""
            width={56}
            height={56}
            className="mx-auto mb-3 rounded-xl"
          />
          <h1 className="text-2xl font-semibold tracking-tight">
            Gestão de Projetos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bugs, tarefas, credenciais e notas da equipa, num só sítio.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
