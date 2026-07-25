import { auth } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Bem-vindo, {session?.user?.name ?? session?.user?.email}
      </h1>
      <p className="mt-2 text-muted-foreground">
        O dashboard global (projetos, atividade recente) vai aparecer aqui.
      </p>
    </div>
  );
}
