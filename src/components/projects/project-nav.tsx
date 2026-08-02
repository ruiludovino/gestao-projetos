"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type ProjectNavProps = {
  projectId: string;
  showCredentials: boolean;
  showSettings: boolean;
};

const tabClass = (isActive: boolean) =>
  cn(
    "flex items-center gap-1 border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
    isActive && "border-primary text-foreground",
  );

export function ProjectNav({ projectId, showCredentials, showSettings }: ProjectNavProps) {
  const pathname = usePathname();
  const base = `/projetos/${projectId}`;
  const [openGroup, setOpenGroup] = useState<"trabalho" | "documentacao" | null>(null);

  const isExact = (href: string) => pathname === href;
  const isPrefixed = (href: string) => pathname.startsWith(href);

  const workItems = [
    { href: `${base}/tarefas/lista`, label: "Tarefas", matchPrefix: `${base}/tarefas` },
    { href: `${base}/bugs`, label: "Bugs", matchPrefix: `${base}/bugs` },
  ];
  const workActive = workItems.some((item) => isPrefixed(item.matchPrefix));

  const docsItems = [
    { href: `${base}/notas`, label: "Notas", matchPrefix: `${base}/notas` },
    { href: `${base}/regras`, label: "Regras", matchPrefix: `${base}/regras` },
    { href: `${base}/rotas`, label: "Rotas Da Aplicação", matchPrefix: `${base}/rotas` },
  ];
  const docsActive = docsItems.some((item) => isPrefixed(item.matchPrefix));

  const toggleGroup = (group: "trabalho" | "documentacao") =>
    setOpenGroup((current) => (current === group ? null : group));

  const expandedItems = openGroup === "trabalho" ? workItems : openGroup === "documentacao" ? docsItems : null;

  return (
    <div className="border-b">
      <nav className="flex gap-1 px-6">
        <Link href={base} className={tabClass(isExact(base))} onClick={() => setOpenGroup(null)}>
          Visão Geral
        </Link>

        <button
          type="button"
          onClick={() => toggleGroup("trabalho")}
          className={tabClass(workActive || openGroup === "trabalho")}
        >
          Trabalho
          <ChevronDown className={cn("size-3.5 transition-transform", openGroup === "trabalho" && "rotate-180")} />
        </button>

        <button
          type="button"
          onClick={() => toggleGroup("documentacao")}
          className={tabClass(docsActive || openGroup === "documentacao")}
        >
          Documentação
          <ChevronDown
            className={cn("size-3.5 transition-transform", openGroup === "documentacao" && "rotate-180")}
          />
        </button>

        {showCredentials && (
          <Link
            href={`${base}/credenciais`}
            className={tabClass(isPrefixed(`${base}/credenciais`))}
            onClick={() => setOpenGroup(null)}
          >
            Credenciais
          </Link>
        )}

        <Link
          href={`${base}/github`}
          className={tabClass(isPrefixed(`${base}/github`))}
          onClick={() => setOpenGroup(null)}
        >
          Integrações
        </Link>

        {showSettings && (
          <Link
            href={`${base}/definicoes`}
            className={tabClass(isPrefixed(`${base}/definicoes`))}
            onClick={() => setOpenGroup(null)}
          >
            Definições
          </Link>
        )}
      </nav>

      {expandedItems && (
        <div className="flex gap-1 border-t bg-muted/40 px-6 py-2">
          {expandedItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpenGroup(null)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                isPrefixed(item.matchPrefix) && "bg-accent text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
