import Link from "next/link";
import { Lock, Plus } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMembership, getCopyTargetProjects } from "@/lib/project-data";
import { canViewCredentials } from "@/lib/permissions";
import { isOwnerEmail } from "@/lib/invites";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CredentialRow } from "@/components/credentials/credential-row";
import { CredentialsSearch } from "@/components/credentials/credentials-search";
import {
  SortableCredentialHead,
  type CredentialSortField,
  type SortDir,
} from "@/components/credentials/sortable-credential-head";
import { AssigneeFilter } from "@/components/shared/assignee-filter";
import { CategoryFilter } from "@/components/credentials/category-filter";
import { CopyToProjectDialog } from "@/components/shared/copy-to-project-dialog";
import { copyAllCredentialsToProjectAction } from "@/actions/credentials";

const SORT_FIELDS: CredentialSortField[] = ["serviceName", "username"];

export default async function CredentialsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{
    responsavel?: string;
    categoria?: string;
    q?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const { projectId } = await params;
  const { responsavel, categoria, q, sort, dir } = await searchParams;
  const sortField: CredentialSortField = SORT_FIELDS.includes(sort as CredentialSortField)
    ? (sort as CredentialSortField)
    : "serviceName";
  const sortDir: SortDir = dir === "desc" ? "desc" : "asc";
  const session = await auth();
  const userId = session!.user.id;

  const membership = await getMembership(projectId, userId);
  const isOwner = !!session?.user?.email && isOwnerEmail(session.user.email);

  if (!canViewCredentials(membership.role)) {
    return (
      <p className="text-sm text-muted-foreground">
        Só Admins e Developers do projeto podem aceder ao cofre de credenciais.
      </p>
    );
  }

  const [credentials, members, categories, copyTargetProjects] = await Promise.all([
    prisma.credential.findMany({
      where: {
        projectId,
        ...(responsavel ? { assigneeId: responsavel } : {}),
        ...(categoria ? { categoryId: categoria } : {}),
        ...(q
          ? {
              OR: [
                { serviceName: { contains: q, mode: "insensitive" } },
                { url: { contains: q, mode: "insensitive" } },
                { username: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { [sortField]: sortDir },
      include: {
        assignee: { select: { name: true, email: true } },
        createdBy: { select: { name: true, email: true } },
        category: { select: { name: true, color: true } },
      },
    }),
    prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.credentialCategory.findMany({
      where: { projectId },
      orderBy: { name: "asc" },
    }),
    getCopyTargetProjects(userId, projectId),
  ]);

  function buildSortHref(field: CredentialSortField, nextDir: SortDir) {
    const params = new URLSearchParams();
    if (responsavel) params.set("responsavel", responsavel);
    if (categoria) params.set("categoria", categoria);
    if (q) params.set("q", q);
    params.set("sort", field);
    params.set("dir", nextDir);
    return `/projetos/${projectId}/credenciais?${params.toString()}`;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Lock className="size-4 text-amber-500" />
          <h1 className="text-xl font-semibold tracking-tight">Cofre de Credenciais</h1>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            Apenas Admin/Developer
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CredentialsSearch />
          <AssigneeFilter members={members} />
          {categories.length > 0 && <CategoryFilter categories={categories} />}
          {credentials.length > 0 && copyTargetProjects.length > 0 && (
            <CopyToProjectDialog
              projects={copyTargetProjects}
              onCopy={copyAllCredentialsToProjectAction.bind(null, projectId)}
              triggerLabel="Copiar todas para outro projeto"
            />
          )}
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
        <p className="text-sm text-muted-foreground">
          {q || responsavel || categoria
            ? "Nenhuma credencial encontrada para essa pesquisa."
            : "Ainda não há credenciais guardadas."}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <SortableCredentialHead
                field="serviceName"
                label="Serviço"
                currentSort={sortField}
                currentDir={sortDir}
                buildHref={buildSortHref}
              />
              <SortableCredentialHead
                field="username"
                label="Username"
                currentSort={sortField}
                currentDir={sortDir}
                buildHref={buildSortHref}
              />
              <TableHead>Password</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Custo</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Criado por</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {credentials.map((credential) => (
              <CredentialRow
                key={credential.id}
                credential={credential}
                members={members}
                categories={categories}
                canDelete={isOwner || credential.createdById === userId}
                copyTargetProjects={copyTargetProjects}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
