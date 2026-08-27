import { redirect } from "next/navigation";

export default function OrchestratorPage() {
  redirect(
    "/orchestrations/new"
  );
}
