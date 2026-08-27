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

const sleep = (ms) =>
  new Promise(
    (resolve) =>
      setTimeout(resolve, ms)
  );

async function waitForRun(
  runId
) {
  const timeoutAt =
    Date.now() + 30000;

  while (
    Date.now() <
    timeoutAt
  ) {
    const run =
      await vigil.runs.get(
        runId
      );

    console.log(
      "Run status:",
      run.status
    );

    if (
      run.status ===
        "SUCCESS" ||
      run.status ===
        "FAILED"
    ) {
      return run;
    }

    await sleep(500);
  }

  throw new Error(
    "Timed out waiting for remote run"
  );
}

async function main() {
  console.log(
    "\n1. Checking registry..."
  );

  const agents =
    await vigil.agents.list();

  const remote =
    agents.find(
      (agent) =>
        agent.slug ===
        "remote-api-debugger"
    );

  if (!remote) {
    throw new Error(
      "remote-api-debugger is not registered"
    );
  }

  console.log(
    `Found ${remote.slug}@${remote.version}`
  );

  console.log(
    "\n2. Starting direct remote run..."
  );

  const created =
    await vigil.agents.run(
      "remote-api-debugger",
      {
        query:
          "A REST API returns HTTP 500 whenever a user updates their profile. Diagnose the likely problem and summarize what should be inspected.",
      }
    );

  console.log(
    "Run:",
    created.runId
  );

  const completed =
    await waitForRun(
      created.runId
    );

  console.log(
    "\nFinal run status:",
    completed.status
  );

  console.log(
    "Result:"
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
      "Remote agent execution did not succeed"
    );
  }

  console.log(
    "\nRemote agent direct E2E passed."
  );
}

main().catch(
  (error) => {
    console.error(
      "\nRemote agent E2E failed."
    );

    console.error(error);

    process.exitCode = 1;
  }
);