type HealthResponse = {
  success: boolean;
  service: string;
  status: string;
};

async function getApiHealth(): Promise<HealthResponse> {
  const response = await fetch("http://localhost:4000/health", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Vigil API is unavailable");
  }

  return response.json();
}

export default async function Home() {
  const health = await getApiHealth();

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="space-y-4 text-center">
        <h1 className="text-5xl font-semibold">Vigil</h1>

        <p className="text-zinc-400">
          Developer infrastructure for AI agents.
        </p>

        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 px-4 py-2">
          <span className="h-2 w-2 rounded-full bg-green-500" />

          <span className="text-sm">
            {health.service}: {health.status}
          </span>
        </div>
      </div>
    </main>
  );
}