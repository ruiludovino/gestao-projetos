import { auth } from "@/auth";
import { isOwnerEmail } from "@/lib/invites";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateProjectForm } from "@/components/projects/create-project-form";

export default async function NewProjectPage() {
  const session = await auth();
  const isOwner = !!session?.user?.email && isOwnerEmail(session.user.email);

  if (!isOwner) {
    return (
      <p className="text-sm text-muted-foreground">
        Só o dono da conta pode criar novos projetos. Pede a um admin de um projeto existente
        para te convidar.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Novo projeto</h1>
      <Card>
        <CardHeader>
          <CardTitle>Detalhes do projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateProjectForm />
        </CardContent>
      </Card>
    </div>
  );
}
