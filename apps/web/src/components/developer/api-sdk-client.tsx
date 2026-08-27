"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Check,
  Clipboard,
  Code2,
  Eye,
  KeyRound,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ApiKeyRecord = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt:
    | string
    | null;
  revokedAt:
    | string
    | null;
};

type CreatedApiKey = {
  apiKey: {
    id: string;
    name: string;
    prefix: string;
    createdAt: string;
  };
  secret: string;
};

function formatDate(
  value:
    | string
    | null
) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle:
        "medium",
      timeStyle:
        "short",
    }
  ).format(
    new Date(value)
  );
}

export function ApiSdkClient() {
  const [apiKeys, setApiKeys] =
    useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [creating, setCreating] =
    useState(false);
  const [revokingId, setRevokingId] =
    useState<string | null>(null);
  const [revealingId, setRevealingId] =
    useState<string | null>(null);
  const [name, setName] =
    useState("");
  const [newSecret, setNewSecret] =
    useState<string | null>(null);
  const [copied, setCopied] =
    useState(false);

  const loadKeys =
    useCallback(async () => {
      try {
        const response =
          await fetch(
            "/api/api-keys",
            {
              cache:
                "no-store",
            }
          );

        const payload =
          await response.json();

        if (
          !response.ok ||
          !payload.success
        ) {
          throw new Error(
            payload.message ??
              "Failed to load API keys"
          );
        }

        setApiKeys(
          payload.data ??
            []
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load API keys"
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  async function createKey() {
    if (!name.trim()) {
      toast.error(
        "Give this key a name first."
      );
      return;
    }

    setCreating(true);

    try {
      const response =
        await fetch(
          "/api/api-keys",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                name:
                  name.trim(),
              }),
          }
        );

      const payload =
        await response.json();

      if (
        !response.ok ||
        !payload.success
      ) {
        throw new Error(
          payload.message ??
            "Failed to create API key"
        );
      }

      const created =
        payload.data as CreatedApiKey;

      setNewSecret(
        created.secret
      );
      setCopied(false);
      setName("");

      await loadKeys();

      toast.success(
        "API key created."
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create API key"
      );
    } finally {
      setCreating(false);
    }
  }

  async function copySecret() {
    if (!newSecret) {
      return;
    }

    await navigator.clipboard.writeText(
      newSecret
    );

    setCopied(true);

    toast.success(
      "API key copied."
    );
  }

  async function revealAndCopyKey(
    apiKeyId: string
  ) {
    setRevealingId(apiKeyId);

    try {
      const response = await fetch(
        `/api/api-keys/${apiKeyId}/reveal`,
        { cache: "no-store" }
      );

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(
          payload.message ??
            "Failed to reveal API key"
        );
      }

      const secret = payload.data?.secret;

      if (typeof secret !== "string") {
        throw new Error(
          "API key secret was not returned"
        );
      }

      await navigator.clipboard.writeText(secret);
      toast.success("API key copied.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to reveal API key"
      );
    } finally {
      setRevealingId(null);
    }
  }

  async function revokeKey(
    apiKeyId: string
  ) {
    setRevokingId(
      apiKeyId
    );

    try {
      const response =
        await fetch(
          `/api/api-keys/${apiKeyId}`,
          {
            method:
              "DELETE",
          }
        );

      const payload =
        await response.json();

      if (
        !response.ok ||
        !payload.success
      ) {
        throw new Error(
          payload.message ??
            "Failed to revoke API key"
        );
      }

      await loadKeys();

      toast.success(
        "API key revoked."
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to revoke API key"
      );
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-6 pb-8">
      <section className="px-0.5 pb-1 pt-1 sm:px-1">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Code2 className="size-4 text-[var(--accent-800)]" />

          <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--ink-3)]">
            Developer
          </span>

          <Badge variant="secondary">
            API & SDK
          </Badge>
        </div>

        <h1 className="text-gradient text-3xl font-extrabold tracking-[-0.045em] sm:text-[38px]">
          Build on Vigil
        </h1>

        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-[var(--ink-2)]">
          Create credentials for programmatic access and connect applications to Vigil&apos;s agent and orchestration runtime.
        </p>
      </section>

      {newSecret ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-[var(--accent-800)]" />

              <CardTitle>
                Save your new API key
              </CardTitle>
            </div>

            <CardDescription>
              Copy this key now or retrieve it later from your key list. Vigil stores the recoverable copy encrypted at rest.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                readOnly
                value={newSecret}
                className="font-mono text-xs"
              />

              <Button
                type="button"
                variant="outline"
                onClick={copySecret}
              >
                {copied ? (
                  <Check />
                ) : (
                  <Clipboard />
                )}

                {copied
                  ? "Copied"
                  : "Copy"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setNewSecret(null)
                }
              >
                I&apos;ve saved it
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>
            API keys
          </CardTitle>

          <CardDescription>
            Keys authenticate server-side applications and the Vigil SDK. Never expose them in browser code.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="api-key-name">
                Key name
              </Label>

              <Input
                id="api-key-name"
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value
                  )
                }
                placeholder="Production backend"
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    event.preventDefault();
                    void createKey();
                  }
                }}
              />
            </div>

            <Button
              type="button"
              onClick={createKey}
              disabled={creating}
            >
              {creating ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Plus />
              )}

              Create key
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--line)]">
            <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-[var(--line)] bg-[var(--hover)] px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--ink-3)] sm:grid-cols-[1.3fr_1fr_1fr_auto]">
              <span>Key</span>
              <span className="hidden sm:block">
                Created
              </span>
              <span className="hidden sm:block">
                Last used
              </span>
              <span>Status</span>
            </div>

            {loading ? (
              <div className="flex min-h-28 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-[var(--ink-3)]" />
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <KeyRound className="mx-auto size-5 text-[var(--ink-3)]" />

                <p className="mt-3 text-sm font-bold text-[var(--ink)]">
                  No API keys yet
                </p>

                <p className="mt-1 text-xs font-medium text-[var(--ink-3)]">
                  Create one to authenticate SDK and direct API requests.
                </p>
              </div>
            ) : (
              apiKeys.map((apiKey) => (
                <div
                  key={apiKey.id}
                  className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-[var(--line)] px-4 py-3 last:border-b-0 sm:grid-cols-[1.3fr_1fr_1fr_auto]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[var(--ink)]">
                      {apiKey.name}
                    </p>

                    <code className="text-[11px] text-[var(--ink-3)]">
                      {apiKey.prefix}
                      ••••••••
                    </code>
                  </div>

                  <span className="hidden text-xs font-medium text-[var(--ink-3)] sm:block">
                    {formatDate(
                      apiKey.createdAt
                    )}
                  </span>

                  <span className="hidden text-xs font-medium text-[var(--ink-3)] sm:block">
                    {formatDate(
                      apiKey.lastUsedAt
                    )}
                  </span>

                  <div className="flex items-center justify-end gap-2">
                    <Badge
                      variant={
                        apiKey.revokedAt
                          ? "outline"
                          : "secondary"
                      }
                    >
                      {apiKey.revokedAt
                        ? "REVOKED"
                        : "ACTIVE"}
                    </Badge>

                    {!apiKey.revokedAt ? (
                      <>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={`Copy ${apiKey.name}`}
                          title="Copy API key"
                          disabled={
                            revealingId ===
                            apiKey.id
                          }
                          onClick={() =>
                            revealAndCopyKey(
                              apiKey.id
                            )
                          }
                        >
                          {revealingId ===
                          apiKey.id ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <Eye />
                          )}
                        </Button>

                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={`Revoke ${apiKey.name}`}
                          title="Revoke API key"
                          disabled={
                            revokingId ===
                            apiKey.id
                          }
                          onClick={() =>
                            revokeKey(
                              apiKey.id
                            )
                          }
                        >
                          {revokingId ===
                          apiKey.id ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <Trash2 />
                          )}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            TypeScript SDK
          </CardTitle>

          <CardDescription>
            This is the target developer experience for the upcoming @vigil/sdk package.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <pre className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--field)] p-4 text-xs leading-6 text-[var(--ink-2)]">
            <code>{`npm install @vigil/sdk`}</code>
          </pre>

          <pre className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--field)] p-4 text-xs leading-6 text-[var(--ink-2)]">
            <code>{`import { Vigil } from "@vigil/sdk";

const vigil = new Vigil({
  apiKey: process.env.VIGIL_API_KEY!,
});

const run = await vigil.orchestrations.create({
  goal: "Review this pull request for security issues",
  context: {
    repository: "owner/repo",
    pullRequest: 42,
  },
});

await vigil.orchestrations.execute(run.id);`}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
