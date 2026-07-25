import Link from "next/link";
import { Plus } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/project-data";
import { canViewCredentials } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CredentialRow } from "@/components/credentials/credential-row";
import { AssigneeFilter } from "@/components/shared/assignee-filter";

export default async function CredentialsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ responsavel?: string }>;
}) {
  const { projectId } = await params;
  const { responsavel } = await searchParams;
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

  const [credentials, members] = await Promise.all([
    prisma.credential.findMany({
      where: { projectId, ...(responsavel ? { assigneeId: responsavel } : {}) },
      orderBy: { serviceName: "asc" },
      include: {
        assignee: { select: { name: true, email: true } },
        createdBy: { select: { name: true, email: true } },
      },
    }),
    prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Credenciais / Plataformas</h1>
        <div className="flex items-center gap-2">
          <AssigneeFilter members={members} />
          <Button
            render={
              <Link href={`/projetos/${projectId}/credenciais/novo`}>
                <Plus className="size-4" />
                Nova credencial
              </Link>
            }
          />
        </div>
      </div>

      {credentials.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ainda não há credenciais guardadas.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Serviço</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Password</TableHead>
              <TableHead>Custo</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Criado por</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {credentials.map((credential) => (
              <CredentialRow key={credential.id} credential={credential} members={members} />
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
