import prisma from "../packages/db/src/index.ts";

const agents = [
  {
    slug: "github-reviewer",
    name: "GitHub Reviewer",
    description:
      "Reviews GitHub pull requests and returns structured feedback.",
    version: "1.0.0",
    capabilities: ["pull-request-review"],
    tools: ["github"],
    permissions: ["repository:read", "pull_requests:read"],
    category: "developer-tools",
    source: "FIRST_PARTY",
    visibility: "PUBLIC",
    isActive: true,
    inputSchema: {
      repository: {
        type: "string",
        required: true,
        description: "GitHub repository in owner/repository format.",
      },
      pullRequest: {
        type: "number",
        required: true,
        description: "Pull request number to review.",
      },
    },
    outputSchema: {
      review: {
        type: "json",
        description: "Structured pull request review result.",
      },
    },
  },

  {
    slug: "security-reviewer",
    name: "Security Reviewer",
    description:
      "Reviews pull request changes for security vulnerabilities, unsafe data handling, access-control problems, injection risks, and other application security issues.",
    version: "1.0.0",
    capabilities: ["security-analysis"],
    tools: ["github.getPullRequest", "github.getPullRequestFiles"],
    permissions: ["repository:read", "pull_requests:read"],
    category: "developer-tools",
    source: "FIRST_PARTY",
    visibility: "PUBLIC",
    isActive: true,
    inputSchema: {
      repository: {
        type: "string",
        required: true,
        description: "GitHub repository in owner/repository format.",
      },
      pullRequest: {
        type: "number",
        required: true,
        description: "Pull request number to review.",
      },
    },
    outputSchema: {
      securityReview: {
        type: "json",
        description: "Structured security review result.",
      },
    },
  },

  {
    slug: "google-search-researcher",
    name: "Google Search Researcher",
    description:
      "Researches current external information using Google ADK, Gemini, and Google Search, then returns a concise evidence-based synthesis.",
    version: "1.0.0",
    capabilities: ["web-research", "information-retrieval"],
    tools: ["google.search"],
    permissions: ["web.read"],
    category: "research",
    source: "FIRST_PARTY",
    visibility: "PUBLIC",
    isActive: true,
    inputSchema: {
      query: {
        type: "string",
        required: true,
        description: "Research objective or question to investigate.",
      },
    },
    outputSchema: {
      research: {
        type: "json",
        description: "Research synthesis produced by the Google ADK worker.",
      },
    },
  },
];

for (const agent of agents) {
  await prisma.agent.upsert({
    where: {
      slug: agent.slug,
    },
    update: agent,
    create: agent,
  });

  console.log(`Seeded ${agent.slug}`);
}

await prisma.$disconnect();

console.log("Cloud agent seed complete.");