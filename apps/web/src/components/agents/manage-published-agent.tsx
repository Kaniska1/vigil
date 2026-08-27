"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  ArrowLeft,
  Loader2,
  Power,
  Save,
  ShieldCheck,
} from "lucide-react";

import {
  toast,
} from "sonner";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Button,
  buttonVariants,
} from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Input,
} from "@/components/ui/input";

import {
  Label,
} from "@/components/ui/label";

import {
  Textarea,
} from "@/components/ui/textarea";

type PublishedAgent = {
  id: string;
  slug: string;
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  permissions: string[];
  category:
    | string
    | null;
  endpointUrl:
    | string
    | null;
  inputSchema:
    | Record<string, unknown>
    | null;
  outputSchema:
    | Record<string, unknown>
    | null;
  isActive: boolean;
};

function parseCsv(
  value: string
) {
  return [
    ...new Set(
      value
        .split(",")
        .map(
          (item) =>
            item.trim()
        )
        .filter(Boolean)
    ),
  ];
}

function parseJsonObject(
  value: string,
  label: string
):
  | Record<string, unknown>
  | undefined {
  if (!value.trim()) {
    return undefined;
  }

  let parsed:
    unknown;

  try {
    parsed =
      JSON.parse(
        value
      );
  } catch {
    throw new Error(
      `${label} must be valid JSON.`
    );
  }

  if (
    typeof parsed !==
      "object" ||
    parsed === null ||
    Array.isArray(
      parsed
    )
  ) {
    throw new Error(
      `${label} must be a JSON object.`
    );
  }

  return parsed as Record<
    string,
    unknown
  >;
}

export function ManagePublishedAgent({
  agentId,
}: {
  agentId: string;
}) {
  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    agent,
    setAgent,
  ] =
    useState<PublishedAgent | null>(
      null
    );

  const [
    name,
    setName,
  ] =
    useState("");

  const [
    description,
    setDescription,
  ] =
    useState("");

  const [
    version,
    setVersion,
  ] =
    useState("");

  const [
    endpointUrl,
    setEndpointUrl,
  ] =
    useState("");

  const [
    category,
    setCategory,
  ] =
    useState("");

  const [
    capabilities,
    setCapabilities,
  ] =
    useState("");

  const [
    permissions,
    setPermissions,
  ] =
    useState("");

  const [
    inputSchema,
    setInputSchema,
  ] =
    useState("{}");

  const [
    outputSchema,
    setOutputSchema,
  ] =
    useState("{}");

  useEffect(() => {
    let cancelled =
      false;

    async function load() {
      try {
        const response =
          await fetch(
            `/api/agents/publish/${agentId}`,
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
              "Failed to load published agent"
          );
        }

        const loaded =
          payload.data as PublishedAgent;

        if (cancelled) {
          return;
        }

        setAgent(
          loaded
        );

        setName(
          loaded.name
        );

        setDescription(
          loaded.description
        );

        setVersion(
          loaded.version
        );

        setEndpointUrl(
          loaded.endpointUrl ??
            ""
        );

        setCategory(
          loaded.category ??
            ""
        );

        setCapabilities(
          loaded.capabilities.join(
            ", "
          )
        );

        setPermissions(
          loaded.permissions.join(
            ", "
          )
        );

        setInputSchema(
          JSON.stringify(
            loaded.inputSchema ??
              {},
            null,
            2
          )
        );

        setOutputSchema(
          JSON.stringify(
            loaded.outputSchema ??
              {},
            null,
            2
          )
        );
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error instanceof
              Error
              ? error.message
              : "Failed to load published agent"
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
  }, [
    agentId,
  ]);

  async function patch(
    body:
      Record<
        string,
        unknown
      >
  ) {
    const response =
      await fetch(
        `/api/agents/publish/${agentId}`,
        {
          method:
            "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              body
            ),
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
          "Failed to update published agent"
      );
    }

    const updated =
      payload.data as PublishedAgent;

    setAgent(
      updated
    );

    return updated;
  }

  async function handleSave() {
    let parsedInputSchema:
      | Record<string, unknown>
      | undefined;

    let parsedOutputSchema:
      | Record<string, unknown>
      | undefined;

    try {
      parsedInputSchema =
        parseJsonObject(
          inputSchema,
          "Input schema"
        );

      parsedOutputSchema =
        parseJsonObject(
          outputSchema,
          "Output schema"
        );
    } catch (error) {
      toast.error(
        error instanceof
          Error
          ? error.message
          : "Invalid schema"
      );

      return;
    }

    setSaving(true);

    try {
      await patch({
        name,
        description,
        version,
        endpointUrl,
        category:
          category.trim() ||
          null,

        capabilities:
          parseCsv(
            capabilities
          ),

        permissions:
          parseCsv(
            permissions
          ),

        inputSchema:
          parsedInputSchema,

        outputSchema:
          parsedOutputSchema,
      });

      toast.success(
        "Agent manifest updated."
      );
    } catch (error) {
      toast.error(
        error instanceof
          Error
          ? error.message
          : "Failed to update agent"
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  async function handleToggleActive() {
    if (!agent) {
      return;
    }

    setSaving(
      true
    );

    try {
      const updated =
        await patch({
          isActive:
            !agent.isActive,
        });

      toast.success(
        updated.isActive
          ? "Agent activated."
          : "Agent deactivated."
      );
    } catch (error) {
      toast.error(
        error instanceof
          Error
          ? error.message
          : "Failed to update agent status"
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-[var(--ink-3)]" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="mx-auto max-w-[900px] rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
        <p className="font-bold">
          Published agent could not be loaded.
        </p>

        <Link
          href="/agents/mine"
          className={buttonVariants({
            variant:
              "outline",
            className:
              "mt-4",
          })}
        >
          <ArrowLeft />
          Back to My Agents
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-6 pb-8">
      <section className="flex flex-col gap-4 px-0.5 pb-1 pt-1 sm:flex-row sm:items-end sm:justify-between sm:px-1">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Link
              href="/agents/mine"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--ink-3)] transition-colors hover:text-[var(--ink)]"
            >
              <ArrowLeft className="size-3.5" />
              My Agents
            </Link>

            <Badge variant="secondary">
              {agent.slug}@
              {agent.version}
            </Badge>

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

          <h1 className="text-gradient text-3xl font-extrabold tracking-[-0.045em] sm:text-[38px]">
            Manage agent
          </h1>

          <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-[var(--ink-2)]">
            Update the published manifest or temporarily remove this agent from discovery without deleting historical runs.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={
              handleToggleActive
            }
            disabled={
              saving
            }
          >
            <Power />
            {agent.isActive
              ? "Deactivate"
              : "Activate"}
          </Button>

          <Button
            type="button"
            onClick={
              handleSave
            }
            disabled={
              saving
            }
          >
            {saving ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Save />
            )}

            Save changes
          </Button>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>
            Manifest
          </CardTitle>

          <CardDescription>
            Slug remains immutable in v1 so existing integrations do not break.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label>
              Slug
            </Label>

            <Input
              value={
                agent.slug
              }
              disabled
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">
              Name
            </Label>

            <Input
              id="name"
              value={
                name
              }
              onChange={(
                event
              ) =>
                setName(
                  event.target.value
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="version">
              Version
            </Label>

            <Input
              id="version"
              value={
                version
              }
              onChange={(
                event
              ) =>
                setVersion(
                  event.target.value
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">
              Category
            </Label>

            <Input
              id="category"
              value={
                category
              }
              onChange={(
                event
              ) =>
                setCategory(
                  event.target.value
                )
              }
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">
              Description
            </Label>

            <Textarea
              id="description"
              value={
                description
              }
              onChange={(
                event
              ) =>
                setDescription(
                  event.target.value
                )
              }
              className="min-h-24"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-[var(--accent-700)]" />

            <CardTitle>
              Runtime & selection
            </CardTitle>
          </div>

          <CardDescription>
            These fields determine how Vigil invokes and selects this worker.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="endpoint">
              Execute endpoint
            </Label>

            <Input
              id="endpoint"
              value={
                endpointUrl
              }
              onChange={(
                event
              ) =>
                setEndpointUrl(
                  event.target.value
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="capabilities">
              Capabilities
            </Label>

            <Input
              id="capabilities"
              value={
                capabilities
              }
              onChange={(
                event
              ) =>
                setCapabilities(
                  event.target.value
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="permissions">
              Permissions
            </Label>

            <Input
              id="permissions"
              value={
                permissions
              }
              onChange={(
                event
              ) =>
                setPermissions(
                  event.target.value
                )
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Input & output schemas
          </CardTitle>

          <CardDescription>
            Changes here immediately affect validation and the schema-driven playground.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="input-schema">
              Input schema
            </Label>

            <Textarea
              id="input-schema"
              value={
                inputSchema
              }
              onChange={(
                event
              ) =>
                setInputSchema(
                  event.target.value
                )
              }
              className="min-h-64 font-mono text-xs"
              spellCheck={
                false
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="output-schema">
              Output schema
            </Label>

            <Textarea
              id="output-schema"
              value={
                outputSchema
              }
              onChange={(
                event
              ) =>
                setOutputSchema(
                  event.target.value
                )
              }
              className="min-h-64 font-mono text-xs"
              spellCheck={
                false
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
