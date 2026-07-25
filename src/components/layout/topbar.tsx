"use client";

import { useRouter } from "next/navigation";

import { signOutAction } from "@/actions/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";

type TopbarProps = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

export function Topbar({ user }: TopbarProps) {
  const router = useRouter();
  const initials = (user.name ?? user.email ?? "?").charAt(0).toUpperCase();

  return (
    <header className="flex h-14 items-center justify-end gap-2 border-b bg-background px-4">
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="size-7">
                <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="text-sm">{user.name ?? user.email}</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push("/perfil")}>
            Perfil
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => signOutAction()}>
            Terminar sessão
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
