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

type Project = { id: string; name: string };

const TYPE_LABELS: Record<string, string> = {
  __all__: "Tarefas e Bugs",
  tarefas: "Só Tarefas",
  bugs: "Só Bugs",
};

export function WorkFilters({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentProject = searchParams.get("projeto") ?? ALL;
  const currentType = searchParams.get("tipo") ?? ALL;

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === ALL) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const projectItems: Record<string, string> = { [ALL]: "Todos os Projetos" };
  for (const project of projects) projectItems[project.id] = project.name;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select items={projectItems} value={currentProject} onValueChange={(v) => v && setParam("projeto", v)}>
        <SelectTrigger className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos os Projetos</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select items={TYPE_LABELS} value={currentType} onValueChange={(v) => v && setParam("tipo", v)}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Tarefas e Bugs</SelectItem>
          <SelectItem value="tarefas">Só Tarefas</SelectItem>
          <SelectItem value="bugs">Só Bugs</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
