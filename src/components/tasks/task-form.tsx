"use client";

import { useActionState } from "react";
import { Priority } from "@prisma/client";

import { createTaskAction, type TaskFormState } from "@/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarkdownEditor } from "@/components/shared/markdown-editor";
import { PRIORITY_LABELS } from "@/components/shared/priority-badge";

const initialState: TaskFormState = {};

type Member = { userId: string; user: { name: string | null; email: string | null } };

export function TaskForm({
  projectId,
  members,
  currentUserId,
}: {
  projectId: string;
  members: Member[];
  currentUserId: string;
}) {
  const action = createTaskAction.bind(null, projectId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input id="title" name="title" required autoFocus />
        {fieldErrors.title && (
          <p className="text-sm text-destructive">{fieldErrors.title[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <MarkdownEditor id="description" name="description" rows={6} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="priority">Prioridade</Label>
          <Select name="priority" items={PRIORITY_LABELS} defaultValue={Priority.MEDIA}>
            <SelectTrigger className="w-full" id="priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(Priority).map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {PRIORITY_LABELS[priority]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="assigneeId">Atribuir a</Label>
          <Select
            name="assigneeId"
            items={Object.fromEntries(
              members.map((member) => [member.userId, member.user.name ?? member.user.email]),
            )}
            defaultValue={currentUserId}
          >
            <SelectTrigger className="w-full" id="assigneeId">
              <SelectValue placeholder="Ninguém" />
            </SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.userId} value={member.userId}>
                  {member.user.name ?? member.user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="deadline">Deadline</Label>
          <Input id="deadline" name="deadline" type="date" />
        </div>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "A criar..." : "Criar tarefa"}
      </Button>
    </form>
  );
}
