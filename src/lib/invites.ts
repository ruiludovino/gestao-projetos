import "server-only";

import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

function ownerEmails(): string[] {
  return (process.env.OWNER_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isOwnerEmail(email: string): boolean {
  return ownerEmails().includes(email.toLowerCase());
}

// So se pode criar conta se: for um email "owner" (sempre autorizado) ou se
// tiver pelo menos um convite pendente para algum projeto.
export async function isEmailAllowedToRegister(email: string): Promise<boolean> {
  if (isOwnerEmail(email)) return true;

  const invite = await prisma.projectInvite.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  return !!invite;
}

// Chamado depois de uma conta nova ser criada (registo ou primeiro login
// GitHub): junta o utilizador a todos os projetos para os quais tinha convite.
export async function consumeInvitesForEmail(userId: string, email: string) {
  const invites = await prisma.projectInvite.findMany({
    where: { email: { equals: email, mode: "insensitive" } },
  });

  for (const invite of invites) {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: invite.projectId, userId } },
      create: { projectId: invite.projectId, userId, role: invite.role },
      update: {},
    });

    await logActivity({
      projectId: invite.projectId,
      userId: invite.invitedById,
      action: "membro.adicionado",
      entityType: "project_member",
      entityId: userId,
      metadata: { email, role: invite.role, viaConvite: true },
    });
  }

  if (invites.length > 0) {
    await prisma.projectInvite.deleteMany({
      where: { email: { equals: email, mode: "insensitive" } },
    });
  }
}
