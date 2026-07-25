import Link from "next/link";
import { Bell, FolderKanban, LayoutDashboard, Search, User } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projetos", label: "Projetos", icon: FolderKanban },
  { href: "/pesquisa", label: "Pesquisa", icon: Search },
  { href: "/notificacoes", label: "Notificações", icon: Bell },
  { href: "/perfil", label: "Perfil", icon: User },
];

export async function AppSidebar() {
  const session = await auth();
  const unreadCount = session?.user?.id
    ? await prisma.notification.count({
        where: { userId: session.user.id, isRead: false },
      })
    : 0;

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <span className="font-semibold tracking-tight">Gestão de Projetos</span>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Icon className="size-4" />
            {label}
            {href === "/notificacoes" && unreadCount > 0 && (
              <Badge className="ml-auto px-1.5 py-0 text-xs">{unreadCount}</Badge>
            )}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
