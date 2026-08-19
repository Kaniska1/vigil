import {
  redirect,
} from "next/navigation";

import {
  ShieldCheck,
} from "lucide-react";

import {
  auth,
  signIn,
} from "@/auth";

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
  Separator,
} from "@/components/ui/separator";

export default async function LoginPage() {
  const session =
    await auth();

  if (session?.user) {
    redirect("/agents");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex size-11 items-center justify-center rounded-lg border">
            <ShieldCheck className="size-5" />
          </div>

          <div>
            <CardTitle className="text-2xl">
              Sign in to Vigil
            </CardTitle>

            <CardDescription className="mt-2">
              Access your agents,
              executions, traces and
              debugging tools.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <form
            action={async () => {
              "use server";

              await signIn(
                "github",
                {
                  redirectTo:
                    "/agents",
                }
              );
            }}
          >
            <Button
              type="submit"
              className="w-full"
            >
              <svg
  viewBox="0 0 24 24"
  className="size-4"
  aria-hidden="true"
>
  <path
    fill="currentColor"
    d="M12 .7a11.3 11.3 0 0 0-3.6 22c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.8.1-.8.1-.8 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.3 3.6 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.4-1.3-5.4-5.8 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0C17.7 3.7 18.7 4 18.7 4c.6 1.6.2 2.9.1 3.2.8.9 1.2 1.9 1.2 3.2 0 4.5-2.8 5.5-5.4 5.8.4.4.8 1.1.8 2.2v3.7c0 .3.2.7.8.6A11.3 11.3 0 0 0 12 .7Z"
  />
</svg>

              Continue with GitHub
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />

            <span className="text-xs uppercase text-muted-foreground">
              or
            </span>

            <Separator className="flex-1" />
          </div>

          <form
            action={async () => {
              "use server";

              await signIn(
                "google",
                {
                  redirectTo:
                    "/agents",
                }
              );
            }}
          >
            <Button
              type="submit"
              variant="outline"
              className="w-full"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-4"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M21.35 11.1H12v2.98h5.38c-.23 1.48-1.64 4.34-5.38 4.34-3.24 0-5.88-2.68-5.88-5.99s2.64-5.99 5.88-5.99c1.85 0 3.08.8 3.79 1.48l2.58-2.53C16.71 3.81 14.56 2.84 12 2.84a9.59 9.59 0 0 0 0 19.18c5.53 0 9.19-3.94 9.19-9.49 0-.64-.07-1.12-.15-1.43Z"
                />
              </svg>

              Continue with Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}