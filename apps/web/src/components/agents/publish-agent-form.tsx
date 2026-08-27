"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  Braces,
  Globe2,
  Loader2,
  PackagePlus,
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

const INPUT_SCHEMA_EXAMPLE =
`{
  "query": {
    "type": "string",
    "description": "Topic to research",
    "required": true
  }
}`;

const OUTPUT_SCHEMA_EXAMPLE =
`{
  "text": {
    "type": "string"
  }
}`;

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
  fieldName: string
):
  | Record<
      string,
      unknown
    >
  | undefined {
  if (!value.trim()) {
    return undefined;
  }

  let parsed:
    unknown;

  try {
    parsed =
      JSON.parse(value);
  } catch {
    throw new Error(
      `${fieldName} must be valid JSON.`
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
      `${fieldName} must be a JSON object.`
    );
  }

  return parsed as Record<
    string,
    unknown
  >;
}

export function PublishAgentForm() {
  const router =
    useRouter();

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    slug,
    setSlug,
  ] =
    useState("");

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
    useState(
      "1.0.0"
    );

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
    useState(
      INPUT_SCHEMA_EXAMPLE
    );

  const [
    outputSchema,
    setOutputSchema,
  ] =
    useState(
      OUTPUT_SCHEMA_EXAMPLE
    );

  async function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !slug.trim() ||
      !name.trim() ||
      !description.trim() ||
      !endpointUrl.trim()
    ) {
      toast.error(
        "Complete the required fields."
      );

      return;
    }

    const parsedCapabilities =
      parseCsv(
        capabilities
      );

    if (
      parsedCapabilities.length ===
      0
    ) {
      toast.error(
        "Add at least one canonical capability."
      );

      return;
    }

    let parsedInputSchema:
      Record<
        string,
        unknown
      >
      | undefined;

    let parsedOutputSchema:
      Record<
        string,
        unknown
      >
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

    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/agents/publish",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                slug:
                  slug.trim(),

                name:
                  name.trim(),

                description:
                  description.trim(),

                version:
                  version.trim() ||
                  "1.0.0",

                endpointUrl:
                  endpointUrl.trim(),

                category:
                  category.trim() ||
                  undefined,

                capabilities:
                  parsedCapabilities,

                permissions:
                  parseCsv(
                    permissions
                  ),

                inputSchema:
                  parsedInputSchema,

                outputSchema:
                  parsedOutputSchema,
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
            "Failed to publish agent"
        );
      }

      toast.success(
        `${name.trim()} was published to Vigil.`
      );

      router.push(
        "/agents/mine"
      );

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof
          Error
          ? error.message
          : "Failed to publish agent"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="mx-auto w-full max-w-[1120px] space-y-6 pb-8"
    >
      <section className="px-0.5 pb-1 pt-1 sm:px-1">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <PackagePlus className="size-4 text-[var(--accent-800)]" />

          <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--ink-3)]">
            Developer
          </span>

          <Badge variant="secondary">
            remote agent
          </Badge>
        </div>

        <h1 className="text-gradient text-3xl font-extrabold tracking-[-0.045em] sm:text-[38px]">
          Publish an agent
        </h1>

        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-[var(--ink-2)]">
          Register an agent you host yourself. Vigil will validate its contract, expose it through the registry, and make it available to orchestration by capability.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>
            Identity
          </CardTitle>

          <CardDescription>
            How developers and Vigil identify this agent.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-5 md:grid-cols-2">
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
              placeholder="Research Summarizer"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">
              Slug
            </Label>

            <Input
              id="slug"
              value={
                slug
              }
              onChange={(
                event
              ) =>
                setSlug(
                  event.target.value
                )
              }
              placeholder="research-summarizer"
            />

            <p className="text-[11px] font-medium text-[var(--ink-3)]">
              Lowercase letters, numbers, and hyphens only.
            </p>
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
              placeholder="Explain what this agent does and when Vigil should use it."
              className="min-h-24"
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
              placeholder="research"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe2 className="size-4 text-[var(--primary-700)]" />

            <CardTitle>
              Runtime endpoint
            </CardTitle>
          </div>

          <CardDescription>
            Vigil invokes this endpoint whenever the agent is selected for a run.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-2">
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
            placeholder="https://agents.example.com/v1/execute"
          />

          <p className="text-[11px] font-medium leading-5 text-[var(--ink-3)]">
            HTTPS is required outside localhost. The endpoint must accept Vigil&apos;s JSON execution contract and return a JSON object containing <code>output</code>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-[var(--accent-700)]" />

            <CardTitle>
              Capabilities & permissions
            </CardTitle>
          </div>

          <CardDescription>
            Capabilities determine when the meta-agent may select this worker. Permissions describe the access it requires.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-5 md:grid-cols-2">
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
              placeholder="web-research, information-retrieval"
            />

            <p className="text-[11px] font-medium leading-5 text-[var(--ink-3)]">
              Comma-separated canonical Vigil capability IDs.
            </p>
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
              placeholder="web:read"
            />

            <p className="text-[11px] font-medium leading-5 text-[var(--ink-3)]">
              Optional comma-separated permission scopes.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Braces className="size-4 text-[var(--secondary-700)]" />

            <CardTitle>
              Input & output contract
            </CardTitle>
          </div>

          <CardDescription>
            These schemas power validation and the schema-driven playground.
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

      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="max-w-2xl text-xs font-medium leading-5 text-[var(--ink-3)]">
          Publishing does not upload or execute arbitrary code inside Vigil. Your service stays hosted by you; Vigil stores its manifest and invokes the endpoint when selected.
        </p>

        <Button
          type="submit"
          disabled={
            loading
          }
          className="shrink-0"
        >
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <PackagePlus />
          )}

          {loading
            ? "Publishing..."
            : "Publish agent"}
        </Button>
      </div>
    </form>
  );
}
