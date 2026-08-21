import { SignJWT } from "jose";

import { auth } from "@/auth";

const secret =
  process.env.VIGIL_API_SECRET;

if (!secret) {
  throw new Error(
    "VIGIL_API_SECRET is not configured"
  );
}

const key =
  new TextEncoder().encode(secret);

export async function createApiToken() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error(
      "UNAUTHENTICATED"
    );
  }

  return new SignJWT({
    userId:
      session.user.id,

    email:
      session.user.email,
  })
    .setProtectedHeader({
      alg: "HS256",
    })
    .setIssuedAt()
    .setExpirationTime("5m")
    .setSubject(
      session.user.id
    )
    .sign(key);
}