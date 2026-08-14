import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { TableHead } from "@/components/ui/table";

export type CredentialSortField = "serviceName" | "username";
export type SortDir = "asc" | "desc";

export function SortableCredentialHead({
  field,
  label,
  currentSort,
  currentDir,
  buildHref,
}: {
  field: CredentialSortField;
  label: string;
  currentSort: CredentialSortField;
  currentDir: SortDir;
  buildHref: (field: CredentialSortField, dir: SortDir) => string;
}) {
  const isActive = currentSort === field;
  const nextDir: SortDir = isActive && currentDir === "asc" ? "desc" : "asc";

  return (
    <TableHead>
      <Link
        href={buildHref(field, nextDir)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        {isActive ? (
          currentDir === "asc" ? (
            <ArrowUp className="size-3.5" />
          ) : (
            <ArrowDown className="size-3.5" />
          )
        ) : (
          <ArrowUpDown className="size-3.5 text-muted-foreground" />
        )}
      </Link>
    </TableHead>
  );
}
