import type { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";

/**
 * Layout for pages that need an account. Sends signed-out visitors to sign-in
 * on the server, as a backstop to the middleware check.
 */
export default async function SignedInLayout({ children }: { children: ReactNode }) {
  await auth.protect();
  return children;
}
