"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  ExternalLink,
  Loader2,
  PackagePlus,
  RadioTower,
} from "lucide-react";

import {
  Badge,
} from "@/components/ui/badge";

import {
  buttonVariants,
} from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PublishedAgent = {
  id: string;
  slug: string;
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  category:
    | string
    | null;
  endpointUrl:
    | string
    | null;
  isActive: boolean;
  createdAt: string;
};

export function MyAgents() {
  const [
    agents,
    setAgents,
  ] =
    useState<PublishedAgent[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  useEffect(() => {
    let cancelled =
      false;

    async function load() {
      try {
        const response =
          await fetch(
            "/api/agents/mine",
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
              "Failed to fetch published agents"
          );
        }

        if (!cancelled) {
          setAgents(
            payload.data ??
              []
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Failed to fetch published agents"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(
            false
          );
        }
      }
    }

    void load();

    return () => {
      cancelled =
        true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-6 pb-8">
      <section className="flex flex-col gap-4 px-0.5 pb-1 pt-1 sm:flex-row sm:items-end sm:justify-between sm:px-1">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <RadioTower className="size-4 text-[var(--accent-800)]" />

            <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--ink-3)]">
              Developer
            </span>

            <Badge variant="secondary">
              published
            </Badge>
          </div>

          <h1 className="text-gradient text-3xl font-extrabold tracking-[-0.045em] sm:text-[38px]">
            My agents
          </h1>

          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[var(--ink-2)]">
            Remote agents you have published into the Vigil registry.
          </p>
        </div>

        <Link
          href="/agents/publish"
          className={buttonVariants()}
        >
          <PackagePlus />
          Publish agent
        </Link>
      </section>

      {loading ? (
        <div className="flex min-h-56 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
          <Loader2 className="size-5 animate-spin text-[var(--ink-3)]" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm font-medium text-destructive">
          {error}
        </div>
      ) : agents.length ===
        0 ? (
        <Card>
          <CardContent className="flex min-h-56 flex-col items-center justify-center text-center">
            <RadioTower className="mb-4 size-8 text-[var(--ink-3)]" />

            <p className="font-bold text-[var(--ink)]">
              No published agents yet
            </p>

            <p className="mt-2 max-w-md text-sm font-medium leading-6 text-[var(--ink-3)]">
              Publish an endpoint-backed agent and it will become discoverable through Vigil&apos;s registry.
            </p>

            <Link
              href="/agents/publish"
              className={buttonVariants({
                className:
                  "mt-5",
              })}
            >
              Publish your first agent
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {agents.map(
            (agent) => (
              <Card
                key={
                  agent.id
                }
                className="overflow-hidden"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <CardTitle className="truncate">
                        {
                          agent.name
                        }
                      </CardTitle>

                      <p className="mt-1 font-mono text-[11px] text-[var(--ink-3)]">
                        {
                          agent.slug
                        }@
                        {
                          agent.version
                        }
                      </p>
                    </div>

                    <Badge
                      variant={
                        agent.isActive
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {agent.isActive
                        ? "ACTIVE"
                        : "INACTIVE"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="line-clamp-3 text-sm font-medium leading-6 text-[var(--ink-2)]">
                    {
                      agent.description
                    }
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {agent.capabilities.map(
                      (
                        capability
                      ) => (
                        <Badge
                          key={
                            capability
                          }
                          variant="outline"
                        >
                          {
                            capability
                          }
                        </Badge>
                      )
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--ink-3)]">
                        Endpoint
                      </p>

                      <p className="mt-1 truncate text-xs font-medium text-[var(--ink-2)]">
                        {
                          agent.endpointUrl ??
                          "Unavailable"
                        }
                      </p>
                    </div>

                    <Link
                      href={`/agents/mine/${agent.id}`}
                      className={buttonVariants({
                        variant:
                          "outline",
                        size:
                          "sm",
                      })}
                    >
                      Manage
                      <ExternalLink />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>
      )}
    </div>
  );
}
