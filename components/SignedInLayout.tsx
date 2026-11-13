import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * Layout for pages that need an account. Sends signed-out visitors to sign-in
 * on the server, as a backstop to the middleware check.
 */
export default async function SignedInLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  return children;
}
