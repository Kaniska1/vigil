import { Vigil } from "@vigil/sdk";

const vigil = new Vigil({
  apiKey: process.env.VIGIL_API_KEY,
  baseUrl: "http://localhost:4000",
});

console.log("\n=== Agents ===");
console.dir(
  await vigil.agents.list(),
  { depth: null }
);

console.log("\n=== Metrics ===");
console.dir(
  await vigil.metrics.get({
    days: 7,
  }),
  { depth: null }
);