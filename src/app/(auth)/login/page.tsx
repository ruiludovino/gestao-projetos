import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GithubSignInButton } from "@/components/auth/github-signin-button";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error === "AccessDenied" && (
          <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            Este email ainda não tem acesso. Pede a um admin de um projeto para
            te convidar antes de entrares com o GitHub.
          </p>
        )}
        <GithubSignInButton />
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">ou</span>
          </div>
        </div>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
