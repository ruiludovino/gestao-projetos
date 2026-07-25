import Link from "next/link";
import { Plus } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/project-data";
import { canViewCredentials } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { CredentialCard } from "@/components/credentials/credential-card";

export default async function CredentialsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const membership = await getMembership(projectId, userId);

  if (!canViewCredentials(membership.role)) {
    return (
      <p className="text-sm text-muted-foreground">
        Só Admins e Developers do projeto podem aceder ao cofre de credenciais.
      </p>
    );
  }

  const credentials = await prisma.credential.findMany({
    where: { projectId },
    orderBy: { serviceName: "asc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Credenciais</h1>
        <Button
          render={
            <Link href={`/projetos/${projectId}/credenciais/novo`}>
              <Plus className="size-4" />
              Nova credencial
            </Link>
          }
        />
      </div>

      {credentials.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ainda não há credenciais guardadas.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {credentials.map((credential) => (
            <CredentialCard key={credential.id} credential={credential} />
          ))}
        </div>
      )}
    </div>
  );
}
