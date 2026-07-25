"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";
const PARAM = "responsavel";

type Member = { userId: string; user: { name: string | null; email: string | null } };

export function AssigneeFilter({ members }: { members: Member[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get(PARAM) ?? ALL;

  function handleChange(next: string | null) {
    if (!next) return;
    const params = new URLSearchParams(searchParams);
    if (next === ALL) {
      params.delete(PARAM);
    } else {
      params.set(PARAM, next);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const items: Record<string, string> = { [ALL]: "Todos os responsáveis" };
  for (const member of members) {
    items[member.userId] = member.user.name ?? member.user.email ?? "?";
  }

  return (
    <Select items={items} value={current} onValueChange={handleChange}>
      <SelectTrigger className="w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Todos os responsáveis</SelectItem>
        {members.map((member) => (
          <SelectItem key={member.userId} value={member.userId}>
            {member.user.name ?? member.user.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
