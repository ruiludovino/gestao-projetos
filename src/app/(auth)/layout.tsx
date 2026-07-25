import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
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
