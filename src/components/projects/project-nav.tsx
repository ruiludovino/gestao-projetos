"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const router = useRouter();
  const base = `/projetos/${projectId}`;

  const isExact = (href: string) => pathname === href;
  const isPrefixed = (href: string) => pathname.startsWith(href);

  const workItems = [
    { href: `${base}/tarefas/lista`, label: "Tarefas", matchPrefix: `${base}/tarefas` },
    { href: `${base}/bugs`, label: "Bugs" },
  ];
  const workActive = workItems.some((item) => isPrefixed(item.matchPrefix ?? item.href));

  const docsItems = [
    { href: `${base}/notas`, label: "Notas" },
    { href: `${base}/regras`, label: "Regras" },
    { href: `${base}/rotas`, label: "Rotas Da Aplicação" },
  ];
  const docsActive = docsItems.some((item) => isPrefixed(item.href));

  return (
    <nav className="flex gap-1 border-b px-6">
      <Link href={base} className={tabClass(isExact(base))}>
        Visão Geral
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button type="button" className={tabClass(workActive)}>
              Trabalho
              <ChevronDown className="size-3.5" />
            </button>
          }
        />
        <DropdownMenuContent align="start">
          {workItems.map((item) => (
            <DropdownMenuItem key={item.href} onClick={() => router.push(item.href)}>
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button type="button" className={tabClass(docsActive)}>
              Documentação
              <ChevronDown className="size-3.5" />
            </button>
          }
        />
        <DropdownMenuContent align="start">
          {docsItems.map((item) => (
            <DropdownMenuItem key={item.href} onClick={() => router.push(item.href)}>
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {showCredentials && (
        <Link href={`${base}/credenciais`} className={tabClass(isPrefixed(`${base}/credenciais`))}>
          Credenciais
        </Link>
      )}

      <Link href={`${base}/github`} className={tabClass(isPrefixed(`${base}/github`))}>
        Integrações
      </Link>

      {showSettings && (
        <Link href={`${base}/definicoes`} className={tabClass(isPrefixed(`${base}/definicoes`))}>
          Definições
        </Link>
      )}
    </nav>
  );
}
