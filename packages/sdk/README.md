# @kaniska1/vigil-sdk

TypeScript SDK for Vigil.

```ts
import { Vigil } from "kaniska1/vigil-sdk";

const vigil = new Vigil({
  apiKey: process.env.VIGIL_API_KEY!,
  baseUrl: "http://localhost:4000",
});

const result = await vigil.orchestrations.run({
  goal: "Review this pull request for security issues",
  context: {
    repository: "owner/repo",
    pullRequest: 42,
  },
});
```
