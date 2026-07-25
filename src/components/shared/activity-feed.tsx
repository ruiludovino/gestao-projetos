import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { describeActivity } from "@/lib/activity-labels";

type ActivityEntry = {
  id: string;
  action: string;
  createdAt: Date;
  user: { name: string | null; email: string | null; image: string | null };
};

export function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Ainda não há atividade.</p>;
  }

  return (
    <ul className="space-y-4">
      {entries.map((entry) => {
        const label = entry.user.name ?? entry.user.email ?? "Alguém";
        const initials = label.charAt(0).toUpperCase();
        return (
          <li key={entry.id} className="flex items-start gap-3 text-sm">
            <Avatar className="size-7">
              <AvatarImage src={entry.user.image ?? undefined} alt={label} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <p>
              <span className="font-medium">{label}</span>{" "}
              <span className="text-muted-foreground">{describeActivity(entry.action)}</span>
              <span className="block text-xs text-muted-foreground">
                {formatDistanceToNow(entry.createdAt, { addSuffix: true, locale: pt })}
              </span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}
