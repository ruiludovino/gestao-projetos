import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CredentialForm } from "@/components/credentials/credential-form";

export default async function NewCredentialPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-xl font-semibold tracking-tight">Nova credencial</h1>
      <Card>
        <CardHeader>
          <CardTitle>Detalhes</CardTitle>
        </CardHeader>
        <CardContent>
          <CredentialForm projectId={projectId} members={members} />
        </CardContent>
      </Card>
    </div>
  );
}
