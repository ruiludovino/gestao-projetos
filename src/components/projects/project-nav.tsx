"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type ProjectNavProps = {
  projectId: string;
  showCredentials: boolean;
  showSettings: boolean;
};

export function ProjectNav({ projectId, showCredentials, showSettings }: ProjectNavProps) {
  const pathname = usePathname();
  const base = `/projetos/${projectId}`;

  const items = [
    { href: base, label: "Dashboard", exact: true },
    { href: `${base}/bugs`, label: "Bugs" },
    { href: `${base}/tarefas/lista`, label: "Tarefas", matchPrefix: `${base}/tarefas` },
    ...(showCredentials
      ? [{ href: `${base}/credenciais`, label: "Credenciais / Plataformas" }]
      : []),
    { href: `${base}/notas`, label: "Notas" },
    { href: `${base}/rotas`, label: "Rotas Da Aplicação" },
    { href: `${base}/regras`, label: "Regras" },
    { href: `${base}/github`, label: "GitHub" },
    ...(showSettings ? [{ href: `${base}/definicoes`, label: "Definições" }] : []),
  ];

  return (
    <nav className="flex gap-1 border-b px-6">
      {items.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.matchPrefix ?? item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              isActive && "border-foreground text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
