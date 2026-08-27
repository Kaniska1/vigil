import {
  Vigil,
} from "../packages/sdk/dist/index.js";

const apiKey =
  process.env.VIGIL_API_KEY;

if (!apiKey) {
  throw new Error(
    "VIGIL_API_KEY is not set"
  );
}

const vigil =
  new Vigil({
    apiKey,
    baseUrl:
      process.env.VIGIL_API_URL ??
      "http://localhost:4000",
  });

async function main() {
  console.log(
    "Creating orchestration..."
  );

  const created =
    await vigil.orchestrations.create({
      goal:
        "Diagnose why a REST API returns HTTP 500 when a user updates their profile.",
      context: {
        query:
          "A REST API returns HTTP 500 whenever a user updates their profile. Diagnose the likely cause and summarize what should be inspected.",
      },
      settings: {
        semanticEvaluation:
          false,
        maxReplans:
          1,
        autoExecute:
          false,
      },
    });

  console.log(
    "Orchestration:",
    created.orchestrationId
  );

  console.log(
  "Status:",
  created.status
);

console.log(
  "Executable:",
  created.plan.executable
);

console.log(
  "Unresolved required:",
  created.plan.unresolvedCapabilities
);

console.log(
  "Unresolved optional:",
  created.plan.unresolvedOptionalCapabilities
);

console.log(
  "\nExecution plan:"
);

  for (
    const step of
    created.plan.executionSteps
  ) {
    console.log(
      `- ${step.agent.slug}@${step.agent.version}`
    );

    console.log(
      `  capabilities: ${step.requiredCapabilities.join(", ")}`
    );
  }

  const selectedRemote =
    created.plan.executionSteps.some(
      (step) =>
        step.agent.slug ===
        "remote-api-debugger"
    );

  if (!selectedRemote) {
    throw new Error(
      "Planner did not select remote-api-debugger"
    );
  }

  console.log(
    "\nRemote agent selected by planner."
  );

  if (
    !created.plan.executable
  ) {
    console.log(
      "Missing inputs:",
      created.plan.missingInputs
    );

    return;
  }

  const execution =
    await vigil.orchestrations.execute(
      created.orchestrationId
    );

  console.log(
    "\nExecution status:",
    execution.status
  );

  console.log(
    "\nStreaming events..."
  );

  const streamPromise =
    (async () => {
      for await (
        const event of
        vigil.orchestrations.stream(
          created.orchestrationId
        )
      ) {
        if (
          event.type ===
          "orchestration"
        ) {
          console.log(
            `[${event.data.type}] ${event.data.message}`
          );
        } else {
          console.log(
            `[DONE] ${event.data.status}`
          );
        }
      }
    })();

  const completed =
    await vigil.orchestrations.waitForCompletion(
      created.orchestrationId,
      {
        pollIntervalMs:
          500,
        timeoutMs:
          30000,
      }
    );

  await streamPromise;

  console.log(
    "\nFinal status:",
    completed.status
  );

  console.log(
    "\nFinal result:"
  );

  console.dir(
    completed.result,
    {
      depth: null,
    }
  );

  if (
    completed.status !==
    "SUCCESS"
  ) {
    throw new Error(
      "Remote orchestration did not succeed"
    );
  }

  console.log(
    "\nRemote-agent orchestration E2E passed."
  );
}

main().catch(
  (error) => {
    console.error(
      "\nRemote orchestration E2E failed."
    );

    console.error(error);

    process.exitCode =
      1;
  }
);