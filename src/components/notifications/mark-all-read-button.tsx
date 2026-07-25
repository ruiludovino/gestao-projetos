"use client";

import { useTransition } from "react";

import { markAllNotificationsReadAction } from "@/actions/notifications";
import { Button } from "@/components/ui/button";

export function MarkAllReadButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => markAllNotificationsReadAction())}
    >
      Marcar todas como lidas
    </Button>
  );
}
