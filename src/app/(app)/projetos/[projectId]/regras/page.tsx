import Link from "next/link";
import { Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMembership, getCopyTargetProjects } from "@/lib/project-data";
import { canEditContent, isCurrentUserOwner } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { DeleteRuleButton } from "@/components/rules/delete-rule-button";
import { CopyToProjectDialog } from "@/components/shared/copy-to-project-dialog";
import { copyRuleToProjectAction, copyAllRulesToProjectAction } from "@/actions/rules";

export default async function RulesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const [membership, isOwner, rules, copyTargetProjects] = await Promise.all([
    getMembership(projectId, userId),
    isCurrentUserOwner(),
    prisma.rule.findMany({
      where: { projectId },
      orderBy: { updatedAt: "desc" },
      include: { createdBy: { select: { name: true, email: true } } },
    }),
    getCopyTargetProjects(userId, projectId),
  ]);

  const canEdit = canEditContent(membership.role);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">Regras</h1>
        <div className="flex items-center gap-2">
          {canEdit && rules.length > 0 && copyTargetProjects.length > 0 && (
            <CopyToProjectDialog
              projects={copyTargetProjects}
              onCopy={copyAllRulesToProjectAction.bind(null, projectId)}
              triggerLabel="Copiar todas para outro projeto"
            />
          )}
          {canEdit && (
            <Button
              render={
                <Link href={`/projetos/${projectId}/regras/nova`}>
                  <Plus className="size-4" />
                  Nova regra
                </Link>
              }
            />
          )}
        </div>
      </div>

      {rules.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ainda não há regras registadas.</p>
      ) : (
        <ul className="space-y-2">
          {rules.map((rule) => (
            <li key={rule.id}>
              <Link
                href={`/projetos/${projectId}/regras/${rule.id}`}
                className="flex items-center justify-between rounded-lg border p-3 hover:border-foreground/30"
              >
                <span className="font-medium">{rule.title}</span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Criado por: {rule.createdBy.name ?? rule.createdBy.email}</span>
                  <span>
                    Atualizada {formatDistanceToNow(rule.updatedAt, { addSuffix: true, locale: pt })}
                  </span>
                  <CopyToProjectDialog
                    projects={copyTargetProjects}
                    onCopy={copyRuleToProjectAction.bind(null, rule.id)}
                    triggerLabel="Copiar para projeto"
                    iconOnly
                  />
                  {(isOwner || rule.createdById === userId) && (
                    <DeleteRuleButton ruleId={rule.id} />
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
