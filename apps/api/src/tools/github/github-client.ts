function getGitHubToken() {
  const token = process.env.GITHUB_TOKEN?.trim();

  if (!token) {
    return null;
  }

  return token;
}

export async function githubFetch(
  path: string,
  init: RequestInit = {}
) {
  const token = getGitHubToken();

  const headers = new Headers(init.headers);

  headers.set(
    "Accept",
    "application/vnd.github+json"
  );

  headers.set(
    "User-Agent",
    "Vigil-Agent-Platform"
  );

  headers.set(
    "X-GitHub-Api-Version",
    "2022-11-28"
  );

  if (token) {
    headers.set(
      "Authorization",
      `Bearer ${token}`
    );
  }

  return fetch(
    `https://api.github.com${path}`,
    {
      ...init,
      headers,
    }
  );
}

export function requireGitHubWriteToken() {
  const token = getGitHubToken();

  if (!token) {
    throw new Error(
      "GITHUB_WRITE_CREDENTIAL_MISSING"
    );
  }

  return token;
}