import Link from "next/link";

import { auth } from "@/server/auth";
import { HydrateClient } from "@/trpc/server";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await auth();

  return (
    // <HydrateClient>
    <main className="bg-background overflow-x-hidden w-full">
      <Button asChild variant="secondary">
        <Link href={session ? "/api/auth/signout" : "/api/auth/signin"}>
          {session ? "Sign out" : "Sign in"}
        </Link>
      </Button>
    </main>
    // </HydrateClient>
  );
}
