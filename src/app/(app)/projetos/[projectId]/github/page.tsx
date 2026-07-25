import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { GitCommit, GitPullRequest } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/project-data";
import { canEditContent } from "@/lib/permissions";
import { listGithubCommits, listGithubIssues, listGithubPulls } from "@/lib/github";
import { GithubIcon } from "@/components/shared/github-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConnectRepoForm } from "@/components/github/connect-repo-form";
import { DisconnectRepoButton } from "@/components/github/disconnect-repo-button";

async function RepoPanel({
  repo,
  accessToken,
}: {
  repo: { id: string; owner: string; name: string; fullName: string };
  accessToken?: string;
}) {
  let issues: Awaited<ReturnType<typeof listGithubIssues>> = [];
  let pulls: Awaited<ReturnType<typeof listGithubPulls>> = [];
  let commits: Awaited<ReturnType<typeof listGithubCommits>> = [];
  let fetchError: string | null = null;

  if (accessToken) {
    try {
      [issues, pulls, commits] = await Promise.all([
        listGithubIssues(accessToken, repo.owner, repo.name),
        listGithubPulls(accessToken, repo.owner, repo.name),
        listGithubCommits(accessToken, repo.owner, repo.name),
      ]);
      issues = issues.filter((issue) => !("pull_request" in issue));
    } catch {
      fetchError = "Não foi possível obter dados do GitHub (permissões ou repositório indisponível).";
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <GithubIcon className="size-4" />
          <a href={`https://github.com/${repo.fullName}`} target="_blank" rel="noreferrer" className="hover:underline">
            {repo.fullName}
          </a>
        </CardTitle>
        <DisconnectRepoButton repoId={repo.id} />
      </CardHeader>
      <CardContent className="space-y-6">
        {!accessToken && (
          <p className="text-sm text-muted-foreground">
            Faz login com GitHub para veres issues, PRs e commits em tempo real.
          </p>
        )}
        {fetchError && <p className="text-sm text-destructive">{fetchError}</p>}

        {accessToken && !fetchError && (
          <>
            <div>
              <h3 className="mb-2 text-sm font-medium">Issues recentes</h3>
              {issues.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem issues.</p>
              ) : (
                <ul className="space-y-1">
                  {issues.slice(0, 8).map((issue) => (
                    <li key={issue.number} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="text-xs">
                        {issue.state === "open" ? "Aberta" : "Fechada"}
                      </Badge>
                      <a href={issue.html_url} target="_blank" rel="noreferrer" className="hover:underline">
                        #{issue.number} {issue.title}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                <GitPullRequest className="size-4" />
                Pull requests recentes
              </h3>
              {pulls.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem pull requests.</p>
              ) : (
                <ul className="space-y-1">
                  {pulls.slice(0, 8).map((pr) => (
                    <li key={pr.number} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="text-xs">
                        {pr.draft ? "Rascunho" : pr.state === "open" ? "Aberto" : "Fechado"}
                      </Badge>
                      <a href={pr.html_url} target="_blank" rel="noreferrer" className="hover:underline">
                        #{pr.number} {pr.title}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                <GitCommit className="size-4" />
                Commits recentes
              </h3>
              {commits.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem commits.</p>
              ) : (
                <ul className="space-y-1">
                  {commits.slice(0, 8).map((commit) => (
                    <li key={commit.sha} className="text-sm">
                      <a href={commit.html_url} target="_blank" rel="noreferrer" className="hover:underline">
                        {commit.commit.message.split("\n")[0]}
                      </a>
                      {commit.commit.author && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {commit.commit.author.name},{" "}
                          {formatDistanceToNow(new Date(commit.commit.author.date), {
                            addSuffix: true,
                            locale: pt,
                          })}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default async function GithubPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const [membership, repos] = await Promise.all([
    getMembership(projectId, userId),
    prisma.githubRepo.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } }),
  ]);

  const canEdit = canEditContent(membership.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">GitHub</h1>
        {canEdit && <ConnectRepoForm projectId={projectId} />}
      </div>

      {repos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ainda não há repositórios ligados a este projeto.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {repos.map((repo) => (
            <RepoPanel key={repo.id} repo={repo} accessToken={session?.githubAccessToken} />
          ))}
        </div>
      )}
    </div>
  );
}
