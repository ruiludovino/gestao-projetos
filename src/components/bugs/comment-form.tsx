"use client";

import { useActionState, useRef } from "react";

import { addBugCommentAction, type BugFormState } from "@/actions/bugs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initialState: BugFormState = {};

export function CommentForm({ bugId }: { bugId: string }) {
  const action = addBugCommentAction.bind(null, bugId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="space-y-2"
    >
      <Textarea name="body" rows={3} placeholder="Escreve um comentário..." required />
      {state.fieldErrors?.body && (
        <p className="text-sm text-destructive">{state.fieldErrors.body[0]}</p>
      )}
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "A comentar..." : "Comentar"}
      </Button>
    </form>
  );
}
