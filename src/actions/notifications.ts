"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Não autenticado.");
  return session.user.id;
}

export async function markNotificationReadAction(notificationId: string) {
  const userId = await requireUserId();
  const notification = await prisma.notification.findUniqueOrThrow({
    where: { id: notificationId },
  });
  if (notification.userId !== userId) {
    throw new Error("Não tens permissão para esta notificação.");
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  revalidatePath("/notificacoes");
}

export async function markAllNotificationsReadAction() {
  const userId = await requireUserId();

  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  revalidatePath("/notificacoes");
}
