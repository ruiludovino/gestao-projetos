import { signInGithubAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "@/components/shared/github-icon";

export function GithubSignInButton() {
  return (
    <form action={signInGithubAction}>
      <Button type="submit" variant="outline" className="w-full">
        <GithubIcon className="size-4" />
        Entrar com GitHub
      </Button>
    </form>
  );
}
