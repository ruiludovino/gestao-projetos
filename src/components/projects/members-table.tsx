"use client";

import { useState, useTransition } from "react";
import { ProjectRole } from "@prisma/client";
import { toast } from "sonner";
import { X } from "lucide-react";

import { removeMemberAction, updateMemberRoleAction } from "@/actions/projects";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Member = {
  userId: string;
  role: ProjectRole;
  user: { name: string | null; email: string | null; image: string | null };
};

type MembersTableProps = {
  projectId: string;
  members: Member[];
  creatorId: string;
  currentUserId: string;
};

export function MembersTable({
  projectId,
  members,
  creatorId,
  currentUserId,
}: MembersTableProps) {
  const [isPending, startTransition] = useTransition();
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  function handleRoleChange(userId: string, role: ProjectRole) {
    setPendingUserId(userId);
    startTransition(async () => {
      try {
        await updateMemberRoleAction(projectId, userId, role);
        toast.success("Role atualizada.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao atualizar role.");
      } finally {
        setPendingUserId(null);
      }
    });
  }

  function handleRemove(userId: string) {
    setPendingUserId(userId);
    startTransition(async () => {
      try {
        await removeMemberAction(projectId, userId);
        toast.success("Membro removido.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao remover membro.");
      } finally {
        setPendingUserId(null);
      }
    });
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Membro</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => {
          const label = member.user.name ?? member.user.email ?? "?";
          const isCreator = member.userId === creatorId;
          const isSelf = member.userId === currentUserId;
          const rowPending = isPending && pendingUserId === member.userId;
          return (
            <TableRow key={member.userId}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="size-7">
                    <AvatarImage src={member.user.image ?? undefined} alt={label} />
                    <AvatarFallback>{label.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {label} {isSelf && <span className="text-muted-foreground">(tu)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{member.user.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Select
                  value={member.role}
                  disabled={isCreator || rowPending}
                  onValueChange={(value) =>
                    handleRoleChange(member.userId, value as ProjectRole)
                  }
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ProjectRole.ADMIN}>Admin</SelectItem>
                    <SelectItem value={ProjectRole.DEVELOPER}>Developer</SelectItem>
                    <SelectItem value={ProjectRole.VIEWER}>Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                {!isCreator && (
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={rowPending}
                    onClick={() => handleRemove(member.userId)}
                    aria-label="Remover membro"
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
