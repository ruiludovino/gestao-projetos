import "server-only";

const GITHUB_API = "https://api.github.com";

type GithubIssue = {
  number: number;
  html_url: string;
  title: string;
  state: string;
};

async function githubFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status}: ${body.slice(0, 300)}`);
  }

  return response.json() as Promise<T>;
}

export function createGithubIssue(
  accessToken: string,
  owner: string,
  repo: string,
  data: { title: string; body?: string; labels?: string[] },
) {
  return githubFetch<GithubIssue>(accessToken, `/repos/${owner}/${repo}/issues`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function listGithubIssues(accessToken: string, owner: string, repo: string) {
  return githubFetch<GithubIssue[]>(
    accessToken,
    `/repos/${owner}/${repo}/issues?state=all&per_page=20`,
  );
}

export function listGithubPulls(accessToken: string, owner: string, repo: string) {
  return githubFetch<
    { number: number; html_url: string; title: string; state: string; draft: boolean }[]
  >(accessToken, `/repos/${owner}/${repo}/pulls?state=all&per_page=20`);
}

export function listGithubCommits(accessToken: string, owner: string, repo: string) {
  return githubFetch<
    {
      sha: string;
      html_url: string;
      commit: { message: string; author: { name: string; date: string } | null };
    }[]
  >(accessToken, `/repos/${owner}/${repo}/commits?per_page=10`);
}

export async function verifyGithubRepo(accessToken: string, owner: string, repo: string) {
  await githubFetch(accessToken, `/repos/${owner}/${repo}`);
}
