import Link from "next/link";

import { auth } from "@/server/auth";
import { api, HydrateClient } from "@/trpc/server";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const hello = await api.post.hello({ text: "from tRPC" });
  const session = await auth();

  if (session?.user) {
    void api.post.getLatest.prefetch();
  }

  return (
    <HydrateClient>
      <main className="bg-background">
        <Button asChild variant='secondary'>
          <Link
                href={session ? "/api/auth/signout" : "/api/auth/signin"}
              >
                {session ? "Sign out" : "Sign in"}
              </Link>
        </Button>
      </main>
    </HydrateClient>
  );
}
