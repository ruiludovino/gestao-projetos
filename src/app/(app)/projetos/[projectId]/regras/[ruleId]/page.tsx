import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/project-data";
import { canEditContent } from "@/lib/permissions";
import { isOwnerEmail } from "@/lib/invites";
import { EditRuleForm } from "@/components/rules/edit-rule-form";
import { DeleteRuleButton } from "@/components/rules/delete-rule-button";

export default async function RuleDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; ruleId: string }>;
}) {
  const { projectId, ruleId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const [membership, rule] = await Promise.all([
    getMembership(projectId, userId),
    prisma.rule.findUnique({ where: { id: ruleId } }),
  ]);
  if (!rule) notFound();

  const canEdit = canEditContent(membership.role);
  const isOwner = !!session?.user?.email && isOwnerEmail(session.user.email);
  const canDelete = isOwner || rule.createdById === userId;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {canDelete && (
        <div className="flex items-center justify-end">
          <DeleteRuleButton ruleId={rule.id} />
        </div>
      )}

      <EditRuleForm ruleId={rule.id} title={rule.title} content={rule.content} canEdit={canEdit} />
    </div>
  );
}
