import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleBadge } from "@/components/shared/role-badge";
import Link from "next/link";

export default async function ProfilePage() {
  const session = await auth();
  const userId = session!.user.id;

  const [user, memberships] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.projectMember.findMany({
      where: { userId },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const label = user.name ?? user.email ?? "?";

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Perfil</h1>

      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <Avatar className="size-14">
            <AvatarImage src={user.image ?? undefined} alt={label} />
            <AvatarFallback className="text-lg">{label.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user.name ?? "Sem nome"}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Os teus projetos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {memberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não pertences a nenhum projeto.</p>
          ) : (
            memberships.map((membership) => (
              <div key={membership.projectId} className="flex items-center justify-between text-sm">
                <Link href={`/projetos/${membership.projectId}`} className="hover:underline">
                  {membership.project.name}
                </Link>
                <RoleBadge role={membership.role} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
