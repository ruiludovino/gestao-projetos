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
const PARAM = "categoria";

type CategoryOption = { id: string; name: string; color: string };

export function CategoryFilter({ categories }: { categories: CategoryOption[] }) {
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

  const items: Record<string, string> = { [ALL]: "Todas as categorias" };
  for (const category of categories) {
    items[category.id] = category.name;
  }

  return (
    <Select items={items} value={current} onValueChange={handleChange}>
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Todas as categorias</SelectItem>
        {categories.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            <span className="flex items-center gap-1.5">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              {category.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
