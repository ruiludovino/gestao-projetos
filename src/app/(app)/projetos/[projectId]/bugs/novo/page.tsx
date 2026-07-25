import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BugForm } from "@/components/bugs/bug-form";

export default async function NewBugPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const [members, labels] = await Promise.all([
    prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.label.findMany({ where: { projectId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold tracking-tight">Novo bug</h1>
      <Card>
        <CardHeader>
          <CardTitle>Detalhes</CardTitle>
        </CardHeader>
        <CardContent>
          <BugForm projectId={projectId} members={members} labels={labels} currentUserId={userId} />
        </CardContent>
      </Card>
    </div>
  );
}
