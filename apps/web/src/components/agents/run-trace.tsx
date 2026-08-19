import {
  Bot,
  CheckCircle2,
  CircleDot,
  DatabaseZap,
  TriangleAlert,
} from "lucide-react";

import type {
  TraceEvent,
} from "@/lib/api";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type Props = {
  runId: string | null;
  status: string;
  events: TraceEvent[];
};

function eventIcon(
  event: TraceEvent
) {
  if (event.type === "ERROR") {
    return (
      <TriangleAlert className="size-4" />
    );
  }

  if (
    event.type === "TOOL_CALLED" ||
    event.type === "TOOL_COMPLETED"
  ) {
    return (
      <DatabaseZap className="size-4" />
    );
  }

  if (
    event.type === "LLM_STARTED" ||
    event.type === "LLM_COMPLETED"
  ) {
    return (
      <Bot className="size-4" />
    );
  }

  if (
    event.type === "RUN_COMPLETED"
  ) {
    return (
      <CheckCircle2 className="size-4" />
    );
  }

  return (
    <CircleDot className="size-4" />
  );
}

export function RunTrace({
  runId,
  status,
  events,
}: Props) {
  if (!runId) {
    return (
      <Card className="mt-6">
        <CardContent className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
          Run an agent to inspect its
          execution trace.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5 py-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          {runId}
        </Badge>

        <Badge>
          {status}
        </Badge>
      </div>

      <Separator />

      {events.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
            Waiting for execution events...
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Card key={event.id}>
              <CardContent className="flex gap-4 py-4">
                <div className="mt-0.5">
                  {eventIcon(event)}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {event.type}
                    </span>

                    <Badge variant="secondary">
                      {new Date(
                        event.createdAt
                      ).toLocaleTimeString()}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {event.message}
                  </p>

                  {event.metadata ? (
                    <pre className="mt-3 overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs">
                      {JSON.stringify(
                        event.metadata,
                        null,
                        2
                      )}
                    </pre>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}