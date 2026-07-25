"use client";

import Link from "next/link";
import { useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

import { markNotificationReadAction } from "@/actions/notifications";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
};

export function NotificationItem({ notification }: { notification: Notification }) {
  const [, startTransition] = useTransition();

  function handleClick() {
    if (!notification.isRead) {
      startTransition(() => {
        markNotificationReadAction(notification.id);
      });
    }
  }

  const content = (
    <div
      className={cn(
        "rounded-lg border p-3",
        !notification.isRead && "border-foreground/20 bg-accent/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{notification.title}</p>
        {!notification.isRead && <span className="mt-1 size-2 shrink-0 rounded-full bg-blue-500" />}
      </div>
      {notification.body && (
        <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        {formatDistanceToNow(notification.createdAt, { addSuffix: true, locale: pt })}
      </p>
    </div>
  );

  if (notification.link) {
    return (
      <Link href={notification.link} onClick={handleClick}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={handleClick} className="w-full text-left">
      {content}
    </button>
  );
}
