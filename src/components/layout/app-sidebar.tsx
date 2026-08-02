import Link from "next/link";
import Image from "next/image";
import { Bell, Command, FolderKanban, LayoutGrid, Search, User } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { projectDotColor } from "@/lib/project-color";
import { Badge } from "@/components/ui/badge";
import { SidebarNavLink } from "@/components/layout/sidebar-nav-link";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Centro de Comando", icon: Command },
  { href: "/trabalho", label: "O Meu Trabalho", icon: LayoutGrid },
  { href: "/projetos", label: "Todos os Projetos", icon: FolderKanban },
  { href: "/pesquisa", label: "Pesquisa", icon: Search },
  { href: "/notificacoes", label: "Notificações", icon: Bell },
  { href: "/perfil", label: "Perfil", icon: User },
];

export async function AppSidebar() {
  const session = await auth();
  const userId = session?.user?.id;

  const [unreadCount, pinnedMemberships] = userId
    ? await Promise.all([
        prisma.notification.count({ where: { userId, isRead: false } }),
        prisma.projectMember.findMany({
          where: { userId, pinned: true, project: { archived: false } },
          include: { project: { select: { id: true, name: true } } },
          orderBy: { project: { updatedAt: "desc" } },
          take: 8,
        }),
      ])
    : [0, []];

  let quickProjects = pinnedMemberships;
  let isPinnedList = true;
  if (userId && quickProjects.length === 0) {
    quickProjects = await prisma.projectMember.findMany({
      where: { userId, project: { archived: false } },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { project: { updatedAt: "desc" } },
      take: 5,
    });
    isPinnedList = false;
  }

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <Image src="/logo.png" alt="" width={24} height={24} className="rounded-md" />
        <span className="font-semibold tracking-tight">Gestão de Projetos</span>
      </div>
      <nav className="space-y-1 p-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <SidebarNavLink key={href} href={href}>
            <Icon className="size-4" />
            {label}
            {href === "/pesquisa" && (
              <span className="ml-auto rounded border border-sidebar-border px-1 font-mono text-[10px] text-muted-foreground">
                ⌘K
              </span>
            )}
            {href === "/notificacoes" && unreadCount > 0 && (
              <Badge className="ml-auto px-1.5 py-0 text-xs">{unreadCount}</Badge>
            )}
          </SidebarNavLink>
        ))}
      </nav>

      {quickProjects.length > 0 && (
        <div className="mt-2 flex-1 overflow-y-auto px-2 pb-2">
          <p className="px-3 pb-1.5 pt-3 text-xs font-medium text-muted-foreground">
            {isPinnedList ? "Projetos Fixados" : "Projetos Recentes"}
          </p>
          <div className="space-y-0.5">
            {quickProjects.map(({ project }) => (
              <Link
                key={project.id}
                href={`/projetos/${project.id}`}
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <span className={`size-1.5 shrink-0 rounded-full ${projectDotColor(project.id)}`} />
                <span className="truncate">{project.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
