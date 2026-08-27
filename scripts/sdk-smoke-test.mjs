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

const baseUrl =
  process.env.VIGIL_API_URL ??
  "http://localhost:4000";

const vigil =
  new Vigil({
    apiKey,
    baseUrl,
  });

async function main() {
  console.log(
    `Using Vigil API: ${baseUrl}`
  );

  console.log(
    "\n1. Listing agents..."
  );

  const agents =
    await vigil.agents.list();

  console.log(
    `Found ${agents.length} agent(s).`
  );

  for (
    const agent of agents
  ) {
    console.log(
      `- ${agent.slug}@${agent.version}`
    );
  }

  console.log(
    "\n2. Creating orchestration..."
  );

  const created =
    await vigil.orchestrations.create({
      goal:
        "Inspect the available agent fleet and produce a concise capability-oriented plan.",
      context: {
  query:
    "Summarize the available Vigil agent capabilities and explain what each agent can do.",
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
    "Summary:",
    created.plan.summary
  );

  if (
    !created.plan.executable
  ) {
    console.log(
      "\nPlan is not executable. This is still a successful SDK/auth smoke test."
    );

    if (
      created.plan.unresolvedCapabilities.length
    ) {
      console.log(
        "Unresolved capabilities:",
        created.plan.unresolvedCapabilities
      );
    }

    if (
      created.plan.missingInputs.length
    ) {
      console.log(
        "Missing inputs:",
        created.plan.missingInputs.map(
          (input) =>
            input.key
        )
      );
    }

    return;
  }

  console.log(
    "\n3. Executing orchestration..."
  );

  const execution =
    await vigil.orchestrations.execute(
      created.orchestrationId
    );

  console.log(
    "Execution status:",
    execution.status
  );

  console.log(
    "\n4. Fetching orchestration state..."
  );

  const details =
    await vigil.orchestrations.get(
      created.orchestrationId
    );

  console.log(
    "Current status:",
    details.status
  );

  console.log(
    "\nSDK smoke test completed successfully."
  );
}

main().catch(
  (error) => {
    console.error(
      "\nSDK smoke test failed."
    );

    console.error(
      error
    );

    process.exitCode =
      1;
  }
);
