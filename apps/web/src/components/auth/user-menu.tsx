import {
  LogOut,
} from "lucide-react";

import {
  signOut,
} from "@/auth";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

import {
  Button,
} from "@/components/ui/button";

type Props = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

function getInitials(
  name?: string | null,
  email?: string | null
) {
  if (name) {
    return name
      .split(" ")
      .map(
        (part) =>
          part[0]
      )
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    email?.[0]?.toUpperCase() ??
    "U"
  );
}

export function UserMenu({
  user,
}: Props) {
  return (
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarImage
          src={
            user.image ??
            undefined
          }
          alt={
            user.name ??
            "User"
          }
        />

        <AvatarFallback>
          {getInitials(
            user.name,
            user.email
          )}
        </AvatarFallback>
      </Avatar>

      <div className="hidden min-w-0 sm:block">
        <p className="truncate text-sm font-medium">
          {user.name ??
            "Vigil User"}
        </p>

        <p className="truncate text-xs text-muted-foreground">
          {user.email}
        </p>
      </div>

      <form
        action={async () => {
          "use server";

          await signOut({
            redirectTo:
              "/login",
          });
        }}
      >
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          aria-label="Sign out"
        >
          <LogOut className="size-4" />
        </Button>
      </form>
    </div>
  );
}