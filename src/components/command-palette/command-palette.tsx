"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Command, FolderKanban, LayoutGrid, Search, User } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { projectDotColor } from "@/lib/project-color";

type Project = { id: string; name: string };

const NAV_ITEMS = [
  { href: "/dashboard", label: "Centro de Comando", icon: Command },
  { href: "/trabalho", label: "O Meu Trabalho", icon: LayoutGrid },
  { href: "/projetos", label: "Todos os Projetos", icon: FolderKanban },
  { href: "/notificacoes", label: "Notificações", icon: Bell },
  { href: "/perfil", label: "Perfil", icon: User },
];

export function CommandPalette({ projects }: { projects: Project[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Pesquisa rápida" description="Navegar e pesquisar em toda a plataforma">
      <CommandInput
        placeholder="Pesquisar projetos, tarefas, bugs, notas..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>Sem resultados.</CommandEmpty>

        {query.trim() && (
          <>
            <CommandGroup heading="Pesquisar">
              <CommandItem onSelect={() => go(`/pesquisa?q=${encodeURIComponent(query.trim())}`)}>
                <Search className="size-4" />
                Pesquisar por &ldquo;{query.trim()}&rdquo;
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Navegação">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <CommandItem key={href} onSelect={() => go(href)}>
              <Icon className="size-4" />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>

        {projects.length > 0 && (
          <CommandGroup heading="Projetos">
            {projects.map((project) => (
              <CommandItem key={project.id} onSelect={() => go(`/projetos/${project.id}`)}>
                <span className={`size-1.5 rounded-full ${projectDotColor(project.id)}`} />
                {project.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
